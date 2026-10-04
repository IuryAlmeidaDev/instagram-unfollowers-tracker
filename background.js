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

// Analisador determinístico do HTML do Instagram (Web Pública / Deslogada)
function parseInstagramProfileHtml(html, username) {
  if (!html || typeof html !== 'string') {
    return { isProfile: false, is404: true, details: null };
  }
  const clean = (username || '').toLowerCase();

  // 1. Verificações de 404 / Página Inacessível
  // Importante: Casar padrões exatos do SSR do Instagram para evitar falsos positivos
  const is404 = html.includes('"pageID":"httpErrorPage"') ||
                html.includes('"canonicalRouteName":"comet.igweb.PolarisErrorRoute"') ||
                html.includes('"show_lox_redesigned_404_page":true') ||
                html.includes('Esta página não está disponível') ||
                html.includes("Sorry, this page isn't available");

  // 2. Indicadores positivos de Perfil Real
  const isProfilePage = html.includes('"pageID":"profilePage"');
  const hasOgProfile = html.includes('property="og:type" content="profile"') ||
                       html.includes('content="profile" property="og:type"');

  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  const titleHasUser = clean && (
    title.toLowerCase().includes(`(@${clean})`) ||
    title.toLowerCase().includes(`(&#064;${clean})`) ||
    (title.toLowerCase().includes(clean) && !title.toLowerCase().includes('page not found') && !title.toLowerCase().includes('não encontrada'))
  );

  const ogUrlMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i);
  const ogUrl = ogUrlMatch ? ogUrlMatch[1] : '';
  const ogUrlMatches = clean && ogUrl.toLowerCase().includes('/' + clean);

  const hasOgTitle = clean && html.includes('property="og:title"') &&
                     (html.toLowerCase().includes(`(@${clean})`) ||
                      html.toLowerCase().includes(`(&#064;${clean})`) ||
                      html.toLowerCase().includes(clean));

  const isProfile = !is404 && (isProfilePage || hasOgProfile || titleHasUser || ogUrlMatches || hasOgTitle);

  let details = null;
  if (isProfile) {
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    const desc = descMatch ? descMatch[1] : '';
    const ogImgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const avatar = ogImgMatch ? ogImgMatch[1] : '';

    let followers = undefined;
    let following = undefined;
    let posts = undefined;

    if (desc) {
      const statsPart = desc.split('-')[0] || '';
      const fMatch = statsPart.match(/([\d\.,KMkmb]+)\s+(?:Followers|Seguidores)/i);
      if (fMatch) followers = fMatch[1].trim();

      const folMatch = statsPart.match(/([\d\.,KMkmb]+)\s+(?:Following|Seguindo)/i);
      if (folMatch) following = folMatch[1].trim();

      const pMatch = statsPart.match(/([\d\.,KMkmb]+)\s+(?:Posts|Publicações|Publicacoes)/i);
      if (pMatch) posts = pMatch[1].trim();
    }

    const isPrivate = html.includes('Este perfil é privado') ||
                      html.includes('This account is private') ||
                      html.includes('"is_private":true');

    details = {
      followers,
      following,
      posts,
      avatar,
      isPrivate
    };
  }

  return { isProfile, is404, details };
}

// Verifica se uma conta existe publicamente na web deslogada (sem cookies de sessão)
async function checkPublicAccountExistence(username) {
  const clean = (username || '').replace(/^@/, '').trim().toLowerCase();
  if (!clean) return { exists: false };

  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(clean)}/`, {
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = await res.text();
    const parsed = parseInstagramProfileHtml(html, clean);

    if (parsed.isProfile && !parsed.is404) {
      return { exists: true, details: parsed.details };
    }

    return { exists: false };
  } catch (e) {
    return { exists: false };
  }
}

// Receptor de Mensagens do Content Script e do Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger_desktop_notification') {
    showDesktopNotification(request);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'check_public_existence') {
    checkPublicAccountExistence(request.username).then((result) => {
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
