// Background Service Worker (Manifest V3) - Quem Não Me Segue no Instagram
// Monitor em segundo plano, Alertas no Desktop e Verificação Avançada de Bloqueios

const ALARM_NAME = 'ig_unfollower_background_check';
const CHECK_INTERVAL_MINUTES = 60; // Checagem a cada 60 minutos (seguro e sem sobrecarga)

// Inicialização de alarmes ao instalar ou inicializar o Chrome
chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
});

function setupAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: CHECK_INTERVAL_MINUTES,
        delayInMinutes: 10
      });
    }
  });
}

// Disparo periódico do alarme em segundo plano
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await performSilentBackgroundCheck();
  }
});

// Checagem silenciosa e segura em segundo plano
async function performSilentBackgroundCheck() {
  try {
    const storage = await chrome.storage.local.get([
      'ig_is_pro',
      'ig_notifications_enabled',
      'ig_logged_in_user_id',
      'ig_followers_snapshot'
    ]);

    // O recurso de monitoramento em segundo plano é do Plano PRO e requer notificações ativadas
    if (!storage.ig_is_pro || storage.ig_notifications_enabled === false) {
      return;
    }

    const userId = storage.ig_logged_in_user_id;
    const prevSnapshot = storage.ig_followers_snapshot;

    if (!userId || !prevSnapshot || !Array.isArray(prevSnapshot.users) || prevSnapshot.users.length === 0) {
      return;
    }

    // Consulta silenciosa da primeira página de seguidores (ou até 200 para verificação rápida)
    const res = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=200`, {
      headers: {
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });

    if (!res.ok) {
      return; // Se deslogado ou rate limit, espera o próximo ciclo
    }

    const data = await res.json();
    const currentBatch = data.users || [];
    const currentMap = new Map();
    currentBatch.forEach(u => {
      const uid = String(u.pk || u.id || u.pk_id);
      currentMap.set(uid, u);
    });

    // Se o usuário tem mais seguidores do que veio no batch de 200, só checa se o anterior estava nesse range
    // Para total segurança contra falsos positivos, compara apenas com os que deveriam estar no início
    const lostUsers = [];
    const prevSample = prevSnapshot.users.slice(0, currentBatch.length);

    prevSample.forEach(prevUser => {
      const uid = String(prevUser.pk || prevUser.id || prevUser.pk_id);
      if (!currentMap.has(uid)) {
        lostUsers.push(prevUser);
      }
    });

    if (lostUsers.length > 0) {
      // Dispara a notificação na área de trabalho
      showDesktopNotification({
        title: '🔔 Instagram: Deixaram de te seguir',
        message: lostUsers.length === 1
          ? `@${lostUsers[0].username} deixou de seguir seu perfil.`
          : `${lostUsers.length} seguidores deixaram seu perfil recentemente.`,
        data: { url: 'https://www.instagram.com/' }
      });
    }
  } catch (e) {
    console.warn('[Background Monitor] Erro na verificação silenciosa:', e);
  }
}

// Dispara notificação nativa do Chrome / Windows
function showDesktopNotification(options) {
  const notificationId = `ig_notif_${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: options.title || 'Quem Não Me Segue - Instagram',
    message: options.message || 'Atualização na sua lista de seguidores.',
    priority: 2,
    requireInteraction: false
  });
}

// Ao clicar na notificação, foca ou abre o Instagram
chrome.notifications.onClicked.addListener((notifId) => {
  chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId) {
        chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      chrome.tabs.create({ url: 'https://www.instagram.com/' });
    }
  });
  chrome.notifications.clear(notifId);
});

// Motor de Verificação de Bloqueio (Dual Check: Logado vs. Anônimo Público)
async function verifyBlockStatus(username) {
  const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();
  if (!cleanUsername) {
    return { status: 'invalid', message: 'Nome de usuário inválido.' };
  }

  try {
    // PASSO 1: Teste com a sessão logada do usuário
    let loggedInProfile = null;
    let loggedInStatus = 0;

    try {
      const resLoggedIn = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`, {
        headers: {
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      loggedInStatus = resLoggedIn.status;
      if (resLoggedIn.ok) {
        const data = await resLoggedIn.json();
        loggedInProfile = data?.data?.user;
      }
    } catch (e) {
      loggedInStatus = 500;
    }

    // Se o usuário logado consegue ver o perfil normalmente
    if (loggedInProfile && loggedInProfile.username) {
      return {
        status: 'unfollow',
        username: cleanUsername,
        title: 'Não te bloqueou (Apenas Unfollow)',
        message: `@${cleanUsername} não te bloqueou. A conta continua aberta e visível para você normalmente.`,
        isBlocked: false,
        isDeactivated: false
      };
    }

    // PASSO 2: O perfil deu erro ou 404 para a conta logada. Faz o teste anônimo/deslogado.
    let publicExists = false;
    try {
      const resPublic = await fetch(`https://www.instagram.com/${cleanUsername}/`, {
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (resPublic.ok) {
        const html = await resPublic.text();
        // Se a página pública retornar meta tags do perfil ou o título do usuário
        const hasUnavailableNotice = html.includes("Esta página não está disponível") ||
                                     html.includes("Sorry, this page isn't available") ||
                                     html.includes("The link you followed may be broken");

        const hasProfileIndicators = html.includes(`@${cleanUsername}`) ||
                                     html.includes(`instagram.com/${cleanUsername}`) ||
                                     html.includes('og:title') ||
                                     html.includes('profile_pic_url');

        if (!hasUnavailableNotice && hasProfileIndicators) {
          publicExists = true;
        }
      }
    } catch (e) {
      publicExists = false;
    }

    // DIAGNÓSTICO FINAL:
    if (publicExists) {
      // O perfil existe para o público geral, mas é inacessível para o usuário logado = BLOQUEIO
      return {
        status: 'blocked',
        username: cleanUsername,
        title: '🚨 TE BLOQUEOU!',
        message: `@${cleanUsername} bloqueou seu perfil. A conta existe publicamente, mas foi bloqueada para você.`,
        isBlocked: true,
        isDeactivated: false
      };
    } else {
      // O perfil não existe nem publicamente = CONTA DESATIVADA / EXCLUÍDA
      return {
        status: 'deactivated',
        username: cleanUsername,
        title: 'Conta Desativada ou Excluída',
        message: `A conta @${cleanUsername} não foi encontrada. O usuário provavelmente desativou ou excluiu o Instagram.`,
        isBlocked: false,
        isDeactivated: true
      };
    }
  } catch (err) {
    return {
      status: 'error',
      username: cleanUsername,
      title: 'Erro na verificação',
      message: 'Não foi possível verificar no momento devido a restrições de conexão.',
      isBlocked: false,
      isDeactivated: false
    };
  }
}

// Receptor de Mensagens do Content Script e do Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger_desktop_notification') {
    showDesktopNotification(request);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'check_block_status') {
    verifyBlockStatus(request.username).then((result) => {
      sendResponse(result);
    });
    return true; // Resposta assíncrona
  }

  if (request.action === 'test_notification') {
    showDesktopNotification({
      title: '🔔 Monitor de Unfollow Ativo (PRO)',
      message: 'Notificações no Desktop funcionando perfeitamente! Você será avisado quando alguém pular fora.'
    });
    sendResponse({ success: true });
    return true;
  }
});
