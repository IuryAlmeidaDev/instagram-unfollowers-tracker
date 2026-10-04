// Content Script para Extensão: Quem Não Me Segue no Instagram (Impeccable Freemium & PRO Edition)

(function () {
  'use strict';

  let overlay = null;
  let isScanning = false;
  let shouldStopScan = false;
  let isPhase1 = false;
  let isEarlyReleased = false;

  // Estado do Plano PRO e Recursos Avançados
  let isPro = false;
  let vipWhitelist = new Set();
  let selectedUids = new Set();
  let isBatchRunning = false;
  let shouldStopBatch = false;
  let isBatchModeActive = false;
  let activeExportMenuCleanup = null;

  let scanResults = {
    notFollowingBack: [],
    fans: [],
    mutual: [],
    recentUnfollowers: []
  };
  let currentTab = 'notFollowingBack';
  let searchTerm = '';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Ícones SVG consistentes e profissionais
  const SVGS = {
    users: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    close: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    stop: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
    externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`,
    verified: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0095f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    lock: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    crown: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/></svg>`,
    star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    starOutline: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    shield: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    sparkles: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    block: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    bell: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    userCheck: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
    userX: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>`,
    refresh: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
    chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    grip: `<svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="7" cy="3" r="1.5"/><circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/></svg>`,
    checkSquare: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    fileText: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    fileSpreadsheet: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="12" y1="13" x2="12" y2="21"/></svg>`
  };

  // Sistema de Toasts Elegantes Dark Mode (Substitui alerts nativos)
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('igToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'igToastContainer';
      container.className = 'ig-unf-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `ig-unf-toast ig-unf-toast-${type}`;

    let iconSvg = SVGS.sparkles;
    if (type === 'success') iconSvg = SVGS.check;
    else if (type === 'warning') iconSvg = SVGS.alert;
    else if (type === 'error') iconSvg = SVGS.block;

    toast.innerHTML = `
      <div class="ig-unf-toast-icon">${iconSvg}</div>
      <div class="ig-unf-toast-message"></div>
      <button class="ig-unf-toast-close" type="button" aria-label="Fechar">${SVGS.close}</button>
    `;

    const msgEl = toast.querySelector('.ig-unf-toast-message');
    if (msgEl) {
      if (typeof message === 'string' && (message.includes('<') || message.includes('&'))) {
        msgEl.innerHTML = message;
      } else {
        msgEl.textContent = message || '';
      }
    }

    container.appendChild(toast);

    let isDismissed = false;
    const dismiss = () => {
      if (isDismissed) return;
      isDismissed = true;
      toast.classList.add('ig-toast-leaving');
      setTimeout(() => {
        toast.remove();
        if (container && container.children.length === 0) {
          container.remove();
        }
      }, 200);
    };

    const closeBtn = toast.querySelector('.ig-unf-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', dismiss);
    }

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return { dismiss };
  }

  // Obtém o ID do usuário logado via cookie ds_user_id
  function getLoggedInUserId() {
    const match = document.cookie.match(/ds_user_id=([0-9]+)/);
    const uid = match ? match[1] : null;
    if (uid && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ig_logged_in_user_id: uid });
    }
    return uid;
  }

  // Analisador determinístico do HTML do Instagram (Sessão Logada e Pública)
  function parseInstagramProfileHtml(html, username) {
    if (!html || typeof html !== 'string') {
      return { isProfile: false, is404: true, details: null };
    }
    const clean = (username || '').toLowerCase();

    // 1. Verificações de 404 / Página Inacessível
    // ATENÇÃO: Casamos padrões exatos do SSR do Instagram para evitar falsos positivos
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

    // 3. Extração de estatísticas e metadados
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

      let fullName = '';
      if (title && title.includes('(')) {
        fullName = title.split('(')[0].trim();
      }

      details = {
        fullName: fullName || undefined,
        followers,
        following,
        posts,
        avatar,
        isPrivate
      };
    }

    return { isProfile, is404, details };
  }

  // Verifica com a sessão ativa se o usuário te bloqueou, desativou ou se está normal
  async function checkUserBlockStatus(username) {
    const clean = (username || '').replace(/^@/, '').trim().toLowerCase();
    if (!clean) {
      return { status: 'invalid', message: 'Digite um usuário válido.' };
    }

    try {
      // 1. TESTE LOGADO: Tenta consultar a página /{clean}/ com a sessão ativa
      let loggedInProfile = null;
      try {
        const pageRes = await fetch(`/${encodeURIComponent(clean)}/`, {
          credentials: 'include'
        });

        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const parsed = parseInstagramProfileHtml(pageHtml, clean);
          if (parsed.isProfile && !parsed.is404) {
            loggedInProfile = parsed;
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar página HTML logada:', e);
      }

      // Se a página carregou normalmente na sua conta: VOCÊ NÃO ESTÁ BLOQUEADO!
      if (loggedInProfile) {
        return {
          status: 'unfollow',
          username: clean,
          title: '🟢 NÃO Te Bloqueou!',
          message: `@${clean} está com o perfil ativo e visível normalmente para você.`,
          isBlocked: false,
          isDeactivated: false,
          details: loggedInProfile.details
        };
      }

      // 1B. FALLBACK LOGADO: Se a requisição HTML falhou ou teve oscilação, tenta topsearch
      try {
        const csrf = getCsrfToken();
        const headers = {
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest'
        };
        if (csrf) headers['X-CSRFToken'] = csrf;

        const searchRes = await fetch(`/api/v1/web/search/topsearch/?context=blended&query=${encodeURIComponent(clean)}`, {
          headers: headers,
          credentials: 'include'
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const match = (searchData.users || []).find(item => item.user && item.user.username.toLowerCase() === clean);
          if (match && match.user) {
            const u = match.user;
            return {
              status: 'unfollow',
              username: clean,
              title: '🟢 NÃO Te Bloqueou!',
              message: `@${clean} aparece normalmente nas suas buscas e seu perfil está acessível.`,
              isBlocked: false,
              isDeactivated: false,
              details: {
                fullName: u.full_name || '',
                isPrivate: !!u.is_private,
                avatar: u.profile_pic_url
              }
            };
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar topsearch:', e);
      }

      // 2. SE O USUÁRIO NÃO É ACESSÍVEL NA SUA SESSÃO LOGADA:
      // Testa se o perfil existe na web pública deslogada (sem cookies)
      let publicResult = null;
      try {
        publicResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'check_public_existence',
            username: clean
          }, resolve);
        });
      } catch (e) {
        publicResult = null;
      }

      const publicExists = !!(publicResult && publicResult.exists);

      if (publicExists) {
        // Salva automaticamente na lista persistente da Central de Bloqueios
        try {
          await saveBlockedByUser({
            username: clean,
            fullName: publicResult?.details?.fullName || '',
            avatar: publicResult?.details?.avatar || '',
            followers: publicResult?.details?.followers,
            following: publicResult?.details?.following,
            posts: publicResult?.details?.posts,
            isPrivate: publicResult?.details?.isPrivate
          });
        } catch (e) {}

        return {
          status: 'blocked',
          username: clean,
          title: '🚨 TE BLOQUEOU!',
          message: `A conta @${clean} está ativa no Instagram, mas foi bloqueada especificamente para o seu perfil.`,
          isBlocked: true,
          isDeactivated: false,
          details: publicResult.details
        };
      } else {
        // Não existe nem para você e nem na web pública = CONTA DESATIVADA OU EXCLUÍDA
        return {
          status: 'deactivated',
          username: clean,
          title: '⚪ Conta Desativada ou Inexistente',
          message: `A conta @${clean} não foi encontrada nem na web pública. A pessoa provavelmente desativou temporariamente, apagou a conta ou trocou de nome de usuário.`,
          isBlocked: false,
          isDeactivated: true
        };
      }
    } catch (err) {
      console.error('Erro na checagem de status:', err);
      return {
        status: 'error',
        username: clean,
        title: 'Erro na Verificação',
        message: 'Não foi possível verificar no momento. Tente novamente em alguns instantes.',
        isBlocked: false,
        isDeactivated: false
      };
    }
  }

  // -------------------------------------------------------------
  // CENTRAL DE BLOQUEIOS: DADOS PERSISTENTES E GERENCIAMENTO
  // -------------------------------------------------------------

  // Obtém lista de usuários que te bloquearam (salvos localmente)
  async function getBlockedByUsers() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_blocked_by_users'], (res) => {
          resolve(Array.isArray(res.ig_blocked_by_users) ? res.ig_blocked_by_users : []);
        });
      } else {
        resolve([]);
      }
    });
  }

  // Salva um usuário na lista de "Quem Te Bloqueou"
  async function saveBlockedByUser(userObj) {
    if (!userObj || !userObj.username) return;
    const clean = userObj.username.replace(/^@/, '').trim().toLowerCase();
    const list = await getBlockedByUsers();
    const idx = list.findIndex(u => (u.username || '').toLowerCase() === clean);
    const entry = {
      username: clean,
      fullName: userObj.fullName || userObj.full_name || '',
      avatar: userObj.avatar || userObj.profile_pic_url || '',
      followers: userObj.followers,
      following: userObj.following,
      posts: userObj.posts,
      isPrivate: !!userObj.isPrivate,
      detectedAt: userObj.detectedAt || Date.now()
    };

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.unshift(entry);
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({ ig_blocked_by_users: list }, resolve);
      });
    }
    return list;
  }

  // Remove um usuário da lista salva de "Quem Te Bloqueou"
  async function removeBlockedByUser(username) {
    const clean = (username || '').replace(/^@/, '').trim().toLowerCase();
    const list = await getBlockedByUsers();
    const updated = list.filter(u => (u.username || '').toLowerCase() !== clean);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({ ig_blocked_by_users: updated }, resolve);
      });
    }
    return updated;
  }

  // Limpa e formata strings decodificadas de JSON ou HTML
  function cleanJsonString(str) {
    if (!str || typeof str !== 'string') return '';
    try {
      return JSON.parse(`"${str}"`);
    } catch (e) {
      return str
        .replace(/\\u0026/g, '&')
        .replace(/\\u003c/g, '<')
        .replace(/\\u003e/g, '>')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\\\\/g, '\\')
        .trim();
    }
  }

  // Tenta identificar o nome de usuário da conta logada atualmente
  function getLoggedInUsername() {
    try {
      const profileLinks = Array.from(document.querySelectorAll('a[href^="/"]'));
      for (const a of profileLinks) {
        const href = a.getAttribute('href') || '';
        if (a.querySelector('img[alt*="perfil"], img[alt*="profile"]') || 
            (a.textContent || '').toLowerCase().includes('perfil') || 
            (a.textContent || '').toLowerCase().includes('profile')) {
          const match = href.match(/^\/([a-zA-Z0-9_\.]+)\/?$/);
          if (match && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(match[1].toLowerCase())) {
            return match[1].toLowerCase();
          }
        }
      }
    } catch (e) {}
    return '';
  }

  // Extrai contas bloqueadas diretamente do DOM de /accounts/blocked_accounts/
  function scrapeBlockedAccountsFromDocument(doc) {
    if (!doc) return [];
    const users = [];
    const seenUsernames = new Set();
    const myUsername = (getLoggedInUsername() || '').toLowerCase();

    const ignoredPhrases = [
      'desbloquear',
      'unblock',
      'inclui outras contas',
      'includes other accounts',
      'contas bloqueadas',
      'blocked accounts',
      'você poderá bloquear',
      'you can block',
      'bloquear',
      'block',
      'pesquisar',
      'search'
    ];

    function isIgnored(str) {
      if (!str) return true;
      const lower = str.toLowerCase().trim();
      return ignoredPhrases.some(p => lower.includes(p));
    }

    // Estratégia 1: Localiza todos os botões de desbloqueio (HTML nativo, Bloks ou ARIA)
    const candidateButtons = Array.from(doc.querySelectorAll('button, div[role="button"], span[role="button"], a[role="button"], [tabindex="0"]')).filter(el => {
      const txt = (el.textContent || el.innerText || '').trim().toLowerCase();
      return txt === 'desbloquear' || txt === 'unblock';
    });

    for (const btn of candidateButtons) {
      // Localiza a linha exata que contém o botão e a foto do avatar do usuário
      let row = btn.parentElement;
      let targetRow = null;

      while (row && row !== doc.body && row !== doc.documentElement) {
        const imgs = row.querySelectorAll('img');
        if (imgs.length === 1) {
          targetRow = row;
          break;
        } else if (imgs.length > 1) {
          break;
        }
        row = row.parentElement;
      }

      if (!targetRow) {
        targetRow = btn.parentElement?.parentElement || btn.parentElement;
      }

      if (!targetRow) continue;

      const img = targetRow.querySelector('img');
      const avatar = img ? (img.getAttribute('src') || img.src || '') : '';
      const imgAlt = img ? (img.getAttribute('alt') || '') : '';

      // Coleta todos os nós de texto folha dentro da linha
      const textCandidates = [];
      const walker = doc.createTreeWalker(targetRow, NodeFilter.SHOW_TEXT, null, false);
      let textNode;
      while ((textNode = walker.nextNode())) {
        const val = (textNode.nodeValue || '').trim();
        if (val.length >= 2 && !isIgnored(val)) {
          if (!textCandidates.includes(val)) {
            textCandidates.push(val);
          }
        }
      }

      let username = '';
      let fullName = '';

      // Tenta achar o @username que respeita o padrão rígido do Instagram: /^[a-zA-Z0-9_\.]{3,30}$/
      for (const txt of textCandidates) {
        if (/^[a-zA-Z0-9_\.]{3,30}$/.test(txt) && !txt.includes(' ') && txt.toLowerCase() !== myUsername) {
          username = txt;
          break;
        }
      }

      // Se não achou por texto, tenta pelo atributo alt da imagem
      if (!username && imgAlt) {
        const cleanAlt = imgAlt
          .replace(/^foto\s+do\s+perfil\s+de\s+/i, '')
          .replace(/'s\s+profile\s+picture$/i, '')
          .replace(/^profile\s+picture\s+of\s+/i, '')
          .replace(/\.$/, '')
          .trim();
        if (/^[a-zA-Z0-9_\.]{3,30}$/.test(cleanAlt) && cleanAlt.toLowerCase() !== myUsername) {
          username = cleanAlt;
        }
      }

      // Procura o nome completo (outro texto diferente do username e não ignorado)
      for (const txt of textCandidates) {
        if (txt !== username && !isIgnored(txt)) {
          fullName = txt;
          break;
        }
      }

      if (!fullName) fullName = username;

      if (username && !seenUsernames.has(username.toLowerCase()) && username.toLowerCase() !== myUsername) {
        seenUsernames.add(username.toLowerCase());
        users.push({
          username: username,
          full_name: fullName,
          profile_pic_url: avatar || '',
          id: '',
          pk: '',
          is_verified: false,
          is_private: false
        });
      }
    }

    // Estratégia 2: Se nenhum botão foi encontrado mas há avatares na tela com links ou textos
    if (users.length === 0) {
      const allImgs = Array.from(doc.querySelectorAll('img[src*="instagram"], img[src*="cdn"], img[src*="fbcdn"]'));
      for (const img of allImgs) {
        let parent = img.parentElement;
        for (let s = 0; s < 5 && parent && parent !== doc.body; s++) {
          const textNodes = Array.from(parent.querySelectorAll('span, div, a'))
            .map(el => (el.textContent || '').trim())
            .filter(t => t.length >= 3 && t.length <= 30 && !isIgnored(t));

          let uCandidate = '';
          for (const txt of textNodes) {
            if (/^[a-zA-Z0-9_\.]{3,30}$/.test(txt) && !txt.includes(' ') && txt.toLowerCase() !== myUsername) {
              uCandidate = txt;
              break;
            }
          }

          if (uCandidate && !seenUsernames.has(uCandidate.toLowerCase())) {
            seenUsernames.add(uCandidate.toLowerCase());
            users.push({
              username: uCandidate,
              full_name: uCandidate,
              profile_pic_url: img.getAttribute('src') || img.src || '',
              id: '',
              pk: '',
              is_verified: false,
              is_private: false
            });
            break;
          }
          parent = parent.parentElement;
        }
      }
    }

    return users;
  }

  // Localiza o bloco JSON delimitado por chaves que engloba um índice
  function getEnclosingJsonObject(text, matchIndex) {
    let braceCount = 0;
    let start = -1;
    for (let i = matchIndex; i >= 0; i--) {
      if (text[i] === '}') braceCount++;
      else if (text[i] === '{') {
        if (braceCount === 0) {
          start = i;
          break;
        }
        braceCount--;
      }
    }
    if (start === -1) return text.slice(Math.max(0, matchIndex - 100), Math.min(text.length, matchIndex + 300));

    braceCount = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end === -1) return text.slice(start, Math.min(text.length, start + 600));
    return text.slice(start, end);
  }

  // Percorre recursivamente objetos JSON procurando estruturas de usuário bloqueado
  function findBlockedUsersInJson(obj, users, seenUsernames, myUsername, myUserId) {
    if (!obj || typeof obj !== 'object') return;

    if (obj.username && typeof obj.username === 'string') {
      const uname = obj.username.toLowerCase().trim();
      const uid = String(obj.pk || obj.id || obj.pk_id || '');
      const isMe = (myUsername && uname === myUsername) || (myUserId && uid && uid === String(myUserId));
      const isReserved = ['instagram', 'facebook', 'meta', 'threads', 'null', 'undefined', 'true', 'false', 'explore', 'reels', 'direct'].includes(uname);

      if (!isMe && !isReserved && !seenUsernames.has(uname)) {
        seenUsernames.add(uname);
        users.push({
          username: obj.username.trim(),
          full_name: cleanJsonString(obj.full_name) || obj.username.trim(),
          profile_pic_url: cleanJsonString(obj.profile_pic_url || obj.profile_pic_url_hd || ''),
          id: uid,
          pk: uid,
          is_verified: !!obj.is_verified,
          is_private: !!obj.is_private
        });
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        findBlockedUsersInJson(item, users, seenUsernames, myUsername, myUserId);
      }
      return;
    }

    for (const key of Object.keys(obj)) {
      findBlockedUsersInJson(obj[key], users, seenUsernames, myUsername, myUserId);
    }
  }

  // Extrai objetos de usuários de um texto/script usando casamento inteligente
  function extractUsersFromText(text, users, seenUsernames, myUsername) {
    if (!text || typeof text !== 'string') return;

    const userRegex = /"username"\s*:\s*"([a-zA-Z0-9_\.]+)"/g;
    let uMatch;

    while ((uMatch = userRegex.exec(text)) !== null) {
      const uname = uMatch[1];
      const unameLower = uname.toLowerCase();

      if (unameLower === myUsername) continue;
      if (['instagram', 'facebook', 'meta', 'threads', 'null', 'undefined', 'true', 'false', 'explore', 'reels', 'direct'].includes(unameLower)) continue;
      if (seenUsernames.has(unameLower)) continue;

      const context = getEnclosingJsonObject(text, uMatch.index);

      let fullName = uname;
      const fnMatch = context.match(/"full_name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (fnMatch && fnMatch[1]) {
        fullName = cleanJsonString(fnMatch[1]);
      }

      let picUrl = '';
      const picMatch = context.match(/"profile_pic_url(?:_hd)?"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (picMatch && picMatch[1]) {
        picUrl = cleanJsonString(picMatch[1]);
      }

      let id = '';
      const idMatch = context.match(/"(?:pk|id|pk_id)"\s*:\s*"?(\d+)"?/);
      if (idMatch && idMatch[1]) {
        id = idMatch[1];
      }

      const isVerified = /"is_verified"\s*:\s*true/.test(context);
      const isPrivate = /"is_private"\s*:\s*true/.test(context);

      seenUsernames.add(unameLower);
      users.push({
        username: uname,
        full_name: fullName || uname,
        profile_pic_url: picUrl || '',
        id: id || '',
        pk: id || '',
        is_verified: isVerified,
        is_private: isPrivate
      });
    }
  }

  // Extrai usuários bloqueados de todas as tags <script> e payloads do SSR do Instagram
  function extractBlockedUsersFromScripts(html) {
    const users = [];
    const seenUsernames = new Set();
    const myUsername = (getLoggedInUsername() || '').toLowerCase();
    const myUserId = getLoggedInUserId();

    if (!html || typeof html !== 'string') return users;

    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1];
      if (!content) continue;

      const trimmed = content.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          findBlockedUsersInJson(parsed, users, seenUsernames, myUsername, myUserId);
        } catch (e) {
          extractUsersFromText(content, users, seenUsernames, myUsername);
        }
      } else {
        const jsonBlobMatch = content.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});/) ||
                              content.match(/requireLazy\(\[[^\]]*\],\s*function\([^)]*\)\s*\{\s*require\("PolarisBlockedAccountsRoot"\)\.render\(([\s\S]*?)\);\s*\}\);/);
        if (jsonBlobMatch && jsonBlobMatch[1]) {
          try {
            const parsed = JSON.parse(jsonBlobMatch[1]);
            findBlockedUsersInJson(parsed, users, seenUsernames, myUsername, myUserId);
          } catch (e) {}
        }
        extractUsersFromText(content, users, seenUsernames, myUsername);
      }
    }

    extractUsersFromText(html, users, seenUsernames, myUsername);

    return users;
  }

  // Resolve o ID numérico do usuário a partir do username quando necessário
  async function resolveUserIdByUsername(username) {
    if (!username) return null;
    const clean = username.toLowerCase().trim();

    try {
      const csrf = getCsrfToken();
      const headers = {
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest'
      };
      if (csrf) headers['X-CSRFToken'] = csrf;

      const pRes = await fetch(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`, {
        headers: headers,
        credentials: 'include'
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData?.data?.user?.id) {
          return String(pData.data.user.id);
        }
      }
    } catch (e) {}

    try {
      const csrf = getCsrfToken();
      const headers = {
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest'
      };
      if (csrf) headers['X-CSRFToken'] = csrf;

      const searchRes = await fetch(`/api/v1/web/search/topsearch/?context=blended&query=${encodeURIComponent(clean)}`, {
        headers: headers,
        credentials: 'include'
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        const match = (data.users || []).find(item => item.user && item.user.username.toLowerCase() === clean);
        if (match && match.user && (match.user.pk || match.user.id)) {
          return String(match.user.pk || match.user.id);
        }
      }
    } catch (e) {}

    try {
      const pageRes = await fetch(`/${encodeURIComponent(clean)}/`, {
        credentials: 'include',
        cache: 'no-store'
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const match = html.match(/"(?:pk|id|user_id)"\s*:\s*"?(\d+)"?/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {}

    return null;
  }

  // Carrega e raspa a página nativa de contas bloqueadas via iframe invisível em segundo plano
  function fetchBlockedAccountsViaIframe() {
    return new Promise((resolve) => {
      // Impede execução recursiva se já estiver dentro de um sub-frame
      if (window.self !== window.top) {
        resolve([]);
        return;
      }

      const iframeId = 'ig-unf-hidden-blocked-frame';
      const existing = document.getElementById(iframeId);
      if (existing) {
        try { existing.remove(); } catch (e) {}
      }

      const iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.src = '/accounts/blocked_accounts/';
      iframe.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 600px; height: 600px; opacity: 0.01; pointer-events: none; z-index: -9999; border: none;';

      let isFinished = false;
      let checkInterval = null;
      let timeoutTimer = null;

      const cleanup = () => {
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        try { iframe.remove(); } catch (e) {}
      };

      const finish = (resultList) => {
        if (isFinished) return;
        isFinished = true;
        cleanup();
        resolve(resultList || []);
      };

      // Limite máximo de espera: 8.5s
      timeoutTimer = setTimeout(() => {
        finish([]);
      }, 8500);

      // Sondagem a cada 350ms no DOM renderizado pelo React/Bloks no iframe
      checkInterval = setInterval(() => {
        try {
          const idoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!idoc || !idoc.body) return;

          const scraped = scrapeBlockedAccountsFromDocument(idoc);
          if (scraped && scraped.length > 0) {
            finish(scraped);
            return;
          }

          // Se a página renderizou e explicitamente indicou estado vazio
          const txt = (idoc.body.innerText || idoc.body.textContent || '').toLowerCase();
          if (txt.includes('nenhuma conta bloqueada') || 
              txt.includes('você não bloqueou') || 
              txt.includes('no blocked accounts') ||
              (txt.includes('contas bloqueadas') && txt.includes('você poderá bloquear') && !txt.includes('desbloquear'))) {
            // Aguarda 1s para ter certeza de que itens atrasados não vão surgir
            setTimeout(() => {
              const recheck = scrapeBlockedAccountsFromDocument(idoc);
              finish(recheck);
            }, 1000);
          }
        } catch (err) {
          // Erros de permissão durante navegação inicial
        }
      }, 350);

      document.body.appendChild(iframe);
    });
  }

  // Busca lista de usuários que você bloqueou no Instagram com múltiplas camadas de detecção
  async function fetchBlockedByMe(forceRefresh = false) {
    let allUsers = [];
    const seenUsernames = new Set();
    const myUsername = (getLoggedInUsername() || '').toLowerCase();
    const myUid = getLoggedInUserId();

    function addUser(u) {
      if (!u || !u.username) return;
      const uname = u.username.toLowerCase().trim();

      if (myUsername && uname === myUsername) return;
      if (u.id && myUid && String(u.id) === String(myUid)) return;
      if (u.pk && myUid && String(u.pk) === String(myUid)) return;
      if (['instagram', 'facebook', 'meta', 'threads', 'null', 'undefined', 'true', 'false', 'explore', 'reels', 'direct'].includes(uname)) return;

      if (!seenUsernames.has(uname)) {
        seenUsernames.add(uname);
        allUsers.push({
          username: u.username.trim(),
          full_name: (u.full_name && !u.full_name.toLowerCase().includes('inclui outras')) ? u.full_name.trim() : u.username.trim(),
          profile_pic_url: u.profile_pic_url || '',
          id: String(u.pk || u.id || ''),
          pk: String(u.pk || u.id || ''),
          is_verified: !!u.is_verified,
          is_private: !!u.is_private
        });
      }
    }

    // 1. CAMADA 1: Se a página atual já for a de contas bloqueadas, raspa o DOM imediatamente
    try {
      if (window.location.pathname.includes('/accounts/blocked_accounts')) {
        const domUsers = scrapeBlockedAccountsFromDocument(document);
        domUsers.forEach(addUser);
        if (allUsers.length > 0) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ig_blocked_by_me_cache: allUsers });
          }
          return { success: true, users: allUsers };
        }
      }
    } catch (e) {
      console.warn('Erro ao raspar DOM atual de bloqueados:', e);
    }

    // 2. CAMADA 2: Se NÃO for forceRefresh, consulta o cache local para carregamento instantâneo
    if (!forceRefresh) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const cacheData = await new Promise(resolve => {
            chrome.storage.local.get(['ig_blocked_by_me_cache'], res => resolve(res ? res.ig_blocked_by_me_cache : null));
          });
          if (Array.isArray(cacheData) && cacheData.length > 0) {
            cacheData.forEach(addUser);
            return { success: true, users: allUsers };
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache de bloqueados:', e);
      }
    }

    // 3. CAMADA 3: Busca dinâmica renderizando a página nativa em iframe em segundo plano
    try {
      const iframeUsers = await fetchBlockedAccountsViaIframe();
      if (Array.isArray(iframeUsers) && iframeUsers.length > 0) {
        iframeUsers.forEach(addUser);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ ig_blocked_by_me_cache: allUsers });
        }
        return { success: true, users: allUsers };
      }
    } catch (e) {
      console.warn('Erro na sincronização via iframe:', e);
    }

    // 4. CAMADA 4: Tenta endpoints de API conhecidos
    const csrf = getCsrfToken();
    const apiHeaders = {
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (csrf) apiHeaders['X-CSRFToken'] = csrf;

    const endpointsToTry = [
      '/api/v1/friendships/blocked_users/',
      '/api/v1/privacy/blocked_users/',
      '/api/v1/users/blocked_list/?count=200',
      '/api/v1/users/blocked_list/',
      '/api/v1/web/privacy/blocked_users/'
    ];

    for (const ep of endpointsToTry) {
      if (allUsers.length > 0) break;
      try {
        const apiRes = await fetch(ep, {
          headers: apiHeaders,
          credentials: 'include'
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          const list = data.blocked_list || data.users || data.blocked_users || [];
          if (Array.isArray(list) && list.length > 0) {
            list.forEach(item => {
              const u = item.user || item;
              addUser(u);
            });
            break;
          }
        }
      } catch (e) {}
    }

    // Salva no cache local se encontrou usuários
    if (allUsers.length > 0) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ig_blocked_by_me_cache: allUsers });
      }
      return {
        success: true,
        users: allUsers
      };
    }

    // 5. CAMADA 5: Se o cache antigo ainda existe, preserva-o em vez de retornar vazio
    try {
      const staleCache = await new Promise(resolve => {
        chrome.storage.local.get(['ig_blocked_by_me_cache'], res => resolve(res ? res.ig_blocked_by_me_cache : null));
      });
      if (Array.isArray(staleCache) && staleCache.length > 0) {
        return {
          success: true,
          users: staleCache
        };
      }
    } catch (e) {}

    return {
      success: false,
      users: [],
      message: 'Sincronize com a página oficial de contas bloqueadas do Instagram com 1 clique.'
    };
  }

  // Desbloqueia um usuário diretamente na API do Instagram
  async function unblockUserApi(userId, username) {
    try {
      const csrf = getCsrfToken();
      const headers = {
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      if (csrf) headers['X-CSRFToken'] = csrf;

      let targetId = userId;
      if ((!targetId || targetId === 'undefined' || targetId === 'null') && username) {
        targetId = await resolveUserIdByUsername(username);
      }

      if (!targetId) {
        console.warn('Não foi possível obter o ID do usuário para desbloquear:', username);
        return false;
      }

      const body = new URLSearchParams({ user_id: String(targetId) }).toString();

      let res = await fetch(`/api/v1/web/friendships/${targetId}/unblock/`, {
        method: 'POST',
        headers: headers,
        body: body,
        credentials: 'include'
      });

      if (!res.ok) {
        res = await fetch(`/api/v1/friendships/unblock/${targetId}/`, {
          method: 'POST',
          headers: headers,
          body: body,
          credentials: 'include'
        });
      }

      if (!res.ok) {
        res = await fetch(`/web/friendships/${targetId}/unblock/`, {
          method: 'POST',
          headers: headers,
          body: body,
          credentials: 'include'
        });
      }

      if (res.ok) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['ig_blocked_by_me_cache'], data => {
            const list = data.ig_blocked_by_me_cache || [];
            const updated = list.filter(item => {
              if (username && item.username.toLowerCase() === username.toLowerCase()) return false;
              if (targetId && (String(item.id) === String(targetId) || String(item.pk) === String(targetId))) return false;
              return true;
            });
            chrome.storage.local.set({ ig_blocked_by_me_cache: updated });
          });
        }
        return true;
      }

      return false;
    } catch (e) {
      console.error('Erro ao desbloquear usuário:', e);
      return false;
    }
  }

  // Obtém o token CSRF para realizar ações de seguir/deseguir
  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    if (match && match[1]) return match[1];

    try {
      if (window._sharedData && window._sharedData.config && window._sharedData.config.csrf_token) {
        return window._sharedData.config.csrf_token;
      }
    } catch (e) {}

    const meta = document.querySelector('meta[name="csrf-token"]') || document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (meta) return meta.value || meta.content || '';

    return '';
  }

  // -------------------------------------------------------------
  // GERENCIADOR DE ESTADO PRO E ARMAZENAMENTO LOCAL
  // -------------------------------------------------------------
  async function loadProStatus() {
    // 1-Click Auto-Ativação Pós-Pagamento PIX (Link Mágico da Página de Obrigado)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('pro_activated') === '1' || window.location.hash.includes('pro_activated=1')) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await new Promise(r => chrome.storage.local.set({ ig_is_pro: true, ig_pro_activated_at: Date.now() }, r));
        }
        isPro = true;
        updateProUiState();
        showToast('🎉 Pagamento PIX confirmado! Seu Plano PRO Vitalício foi ativado.', 'success', 6000);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
      }
      if (urlParams.get('pro_reset') === '1' || window.location.hash.includes('pro_reset=1')) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await new Promise(r => chrome.storage.local.remove(['ig_is_pro', 'ig_pro_license', 'ig_pro_activated_at'], r));
        }
        isPro = false;
        updateProUiState();
        showToast('Status PRO redefinido para Gratuito para testes.', 'info', 4000);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return false;
      }
    } catch (e) {}

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_is_pro', 'ig_pro_license'], (res) => {
          isPro = !!res.ig_is_pro;
          resolve(isPro);
        });
      } else {
        isPro = false;
        resolve(false);
      }
    });
  }

  const PRO_CHECKOUT_URL = 'https://pay.kiwify.com.br/SEU_LINK'; // Substitua pelo link do seu produto Kiwify
  const LICENSE_SALT = 'IG_PRO_2026_SECRET_KEY';
  const LICENSE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  function calculateKeyChecksum(str) {
    let hash = 5381;
    const combined = str + LICENSE_SALT;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) + hash) + combined.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    let result = '';
    let num = Math.abs(hash);
    for (let i = 0; i < 5; i++) {
      result += LICENSE_CHARS[num % LICENSE_CHARS.length];
      num = Math.floor(num / LICENSE_CHARS.length) + (i * 7);
    }
    return result;
  }

  function isValidLicenseKey(key) {
    if (!key) return false;
    const clean = key.trim().toUpperCase();
    if (clean === 'PRO-VIP-2026') return true;
    const parts = clean.split('-');
    if (parts.length !== 4 || parts[0] !== 'IGPRO') return false;
    if (parts[1].length !== 5 || parts[2].length !== 5 || parts[3].length !== 5) return false;
    return calculateKeyChecksum(parts[1] + parts[2]) === parts[3];
  }

  async function activateLicense(key) {
    const clean = (key || '').trim().toUpperCase();
    if (isValidLicenseKey(clean)) {
      isPro = true;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise(r => chrome.storage.local.set({ ig_is_pro: true, ig_pro_license: clean }, r));
      }
      updateProUiState();
      return { success: true, message: '🎉 Plano PRO Vitalício ativado com sucesso! Aproveite todos os recursos.' };
    }
    return { success: false, message: 'Chave inválida. Verifique o código recebido no seu e-mail da compra ou use a chave de teste PRO-VIP-2026.' };
  }

  async function loadVipWhitelist() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_vip_whitelist'], (res) => {
          const list = res.ig_vip_whitelist || [];
          vipWhitelist = new Set(list.map(String));
          resolve(vipWhitelist);
        });
      } else {
        vipWhitelist = new Set();
        resolve(vipWhitelist);
      }
    });
  }

  async function toggleVipUser(user) {
    const uid = String(user.pk || user.id || user.pk_id);
    if (vipWhitelist.has(uid)) {
      vipWhitelist.delete(uid);
    } else {
      vipWhitelist.add(uid);
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise(r => chrome.storage.local.set({ ig_vip_whitelist: Array.from(vipWhitelist) }, r));
    }
    updateTabBadges();
    return vipWhitelist.has(uid);
  }

  // Compara o histórico da varredura anterior com a atual
  async function computeRecentUnfollowers(currentFollowersMap) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_followers_snapshot'], (res) => {
          const prev = res.ig_followers_snapshot;
          const lost = [];
          if (prev && prev.users && Array.isArray(prev.users)) {
            prev.users.forEach((u) => {
              const uid = String(u.pk || u.id || u.pk_id);
              if (!currentFollowersMap.has(uid)) {
                lost.push({
                  ...u,
                  lostAt: Date.now()
                });
              }
            });
          }

          // Atualiza snapshot histórico com a data atual
          const newSnapshot = {
            timestamp: Date.now(),
            users: Array.from(currentFollowersMap.values()).map(u => ({
              pk: u.pk || u.id,
              username: u.username,
              full_name: u.full_name,
              profile_pic_url: u.profile_pic_url,
              is_verified: !!u.is_verified
            }))
          };
          chrome.storage.local.set({ ig_followers_snapshot: newSnapshot }, () => {
            resolve(lost);
          });
        });
      } else {
        resolve([]);
      }
    });
  }

  // -------------------------------------------------------------
  // INTERFACE PRINCIPAL E BOTÃO FLUTUANTE
  // -------------------------------------------------------------
  let floatingBtnTop = null;

  function injectFloatingButton() {
    let btn = document.querySelector('.ig-unfollowers-floating-btn');
    if (btn) return;

    btn = document.createElement('button');
    btn.className = 'ig-unfollowers-floating-btn';
    btn.title = 'Quem Não Me Segue no Instagram? (Arraste na vertical para reposicionar)';
    btn.setAttribute('aria-label', 'Quem Não Me Segue no Instagram');
    btn.innerHTML = `
      <span class="ig-btn-grip" aria-hidden="true">${SVGS.grip}</span>
      <span class="ig-btn-icon">${SVGS.users}</span>
      <span class="ig-btn-text">Quem Não Me Segue?</span>
    `;

    // Restaura posição vertical salva
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ig_floating_btn_top'], (res) => {
        if (res && res.ig_floating_btn_top) {
          floatingBtnTop = res.ig_floating_btn_top;
          btn.style.top = res.ig_floating_btn_top;
        }
      });
    }

    // Comportamento de arrasto vertical suave (Pointer Events)
    let isDragging = false;
    let startY = 0;
    let initialTop = 0;
    let hasMoved = false;

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startY = e.clientY;
      const rect = btn.getBoundingClientRect();
      initialTop = rect.top;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    btn.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) {
        hasMoved = true;
        btn.classList.add('is-dragging');
        const minTop = 40;
        const maxTop = window.innerHeight - (btn.offsetHeight || 44) - 40;
        let newTop = initialTop + dy;
        newTop = Math.max(minTop, Math.min(newTop, maxTop));
        btn.style.top = `${newTop}px`;
        btn.style.bottom = 'auto';
      }
    });

    const finishDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setTimeout(() => {
        btn.classList.remove('is-dragging');
      }, 50);

      if (hasMoved) {
        floatingBtnTop = btn.style.top;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ ig_floating_btn_top: floatingBtnTop });
        }
      }
    };

    btn.addEventListener('pointerup', finishDrag);
    btn.addEventListener('pointercancel', finishDrag);

    btn.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
        return;
      }
      openModal();
    });

    document.body.appendChild(btn);
  }

  async function openModal() {
    await loadProStatus();
    await loadVipWhitelist();
    if (!overlay) {
      createModal();
    }
    updateProUiState();
    overlay.style.display = 'flex';
    setTimeout(() => {
      const initialFocus = overlay.querySelector('#igSearchInput') || overlay.querySelector('#igUnfClose');
      if (initialFocus) initialFocus.focus();
    }, 60);
  }

  function closeModal() {
    if (overlay) {
      overlay.style.display = 'none';
      if (activeExportMenuCleanup) {
        activeExportMenuCleanup();
        activeExportMenuCleanup = null;
      }
      const floatingBtn = document.querySelector('.ig-unfollowers-floating-btn');
      if (floatingBtn) floatingBtn.focus();
    }
  }

  function updateProUiState() {
    if (!overlay) return;
    const badgeContainer = overlay.querySelector('#igProBadgeContainer');
    const triggerBtn = overlay.querySelector('#igProTriggerBtn');

    if (badgeContainer) {
      if (isPro) {
        badgeContainer.innerHTML = `<span class="ig-unf-pro-gold-badge">${SVGS.crown} PRO</span>`;
      } else {
        badgeContainer.innerHTML = `<span class="ig-unf-free-badge">FREE</span>`;
      }
    }

    if (triggerBtn) {
      if (isPro) {
        triggerBtn.style.display = 'none';
      } else {
        triggerBtn.style.display = 'flex';
      }
    }
  }

  // Cria o modal visual principal
  function createModal() {
    overlay = document.createElement('div');
    overlay.className = 'ig-unf-overlay';

    overlay.innerHTML = `
      <div class="ig-unf-modal" role="dialog" aria-modal="true" aria-labelledby="igModalTitle">
        <div class="ig-unf-header">
          <div class="ig-unf-title-group">
            <div class="ig-unf-logo-badge">${SVGS.users}</div>
            <div class="ig-unf-title" id="igModalTitle">Detector de Não Seguidores</div>
            <div id="igProBadgeContainer"></div>
          </div>
          <div class="ig-unf-header-actions">
            <button class="ig-unf-ghost-btn" id="igBlockModalBtn" title="Gerenciar bloqueios e ver quem te bloqueou no Instagram">
              ${SVGS.block}
              <span>Central de Bloqueios</span>
            </button>
            <button class="ig-unf-pro-btn" id="igProTriggerBtn">
              ${SVGS.crown}
              <span>Seja PRO</span>
            </button>
            <button class="ig-unf-close-btn" id="igUnfClose" aria-label="Fechar painel">${SVGS.close}</button>
          </div>
        </div>

        <div class="ig-unf-body" id="igUnfBody"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#igUnfClose').addEventListener('click', closeModal);
    overlay.querySelector('#igBlockModalBtn').addEventListener('click', () => openBlockCheckerModal());
    overlay.querySelector('#igProTriggerBtn').addEventListener('click', openProModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !isScanning && !isBatchRunning) {
        closeModal();
      }
    });

    renderInitialView();
  }

  // Modal com benefícios e ativação do PRO
  function openProModal() {
    const existing = document.getElementById('igProModal');
    if (existing) existing.remove();

    const proModal = document.createElement('div');
    proModal.className = 'ig-unf-pro-overlay';
    proModal.id = 'igProModal';

    proModal.innerHTML = `
      <div class="ig-unf-pro-dialog" role="dialog" aria-modal="true">
        <div class="ig-unf-pro-dialog-header">
          <div class="ig-unf-pro-hero-badge">${SVGS.crown}</div>
          <div class="ig-unf-pro-dialog-title">Desbloqueie Todo o Poder com o PRO</div>
          <div class="ig-unf-pro-dialog-subtitle">
            A identificação de quem não te segue é 100% gratuita. O PRO adiciona histórico de quem pulou fora, quem te bloqueou e alertas no Desktop.
          </div>
          <button class="ig-unf-close-btn ig-unf-pro-close" id="igProCloseBtn" aria-label="Fechar">${SVGS.close}</button>
        </div>

        <div class="ig-unf-pro-features-grid">
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon alert">${SVGS.alert}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Histórico de Unfollows Recentes</strong>
              <span>Saiba exatamente quem deixou de te seguir desde ontem ou desde a última varredura.</span>
            </div>
          </div>
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon block">${SVGS.block}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Detector Real de Bloqueios</strong>
              <span>Diferencia com precisão quem te bloqueou, quem desativou a conta e quem apenas deu unfollow.</span>
            </div>
          </div>
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon bell">${SVGS.bell}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Alertas no Desktop (Windows/Mac)</strong>
              <span>Monitor silencioso em segundo plano que notifica na área de trabalho quando alguém der unfollow.</span>
            </div>
          </div>
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon star">${SVGS.star}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Lista VIP Blindada</strong>
              <span>Proteja amigos, familiares e parceiros contra cliques acidentais de unfollow.</span>
            </div>
          </div>
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon batch">${SVGS.trash}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Deseguir em Massa Seguro</strong>
              <span>Fila inteligente com intervalos humanos anti-bloqueio entre 8 e 13 segundos.</span>
            </div>
          </div>
          <div class="ig-unf-pro-feature-item">
            <div class="ig-unf-pro-feat-icon chart">${SVGS.download}</div>
            <div class="ig-unf-pro-feat-content">
              <strong>Exportação Detalhada</strong>
              <span>Exporte relatórios prontos em CSV e TXT com status VIP e links diretos.</span>
            </div>
          </div>
        </div>

        <div class="ig-unf-pro-activation-box">
          ${isPro ? `
            <div class="ig-unf-pro-act-label">Plano PRO Vitalício Ativo ✓</div>
            <div class="ig-unf-pro-settings-group">
              <label class="ig-unf-pro-toggle-label">
                <span>🔔 Alertas de Unfollow na Área de Trabalho</span>
                <input type="checkbox" id="igProNotifSwitch" checked style="accent-color: #f59e0b; cursor: pointer;">
              </label>
              <div class="ig-unf-pro-actions-row">
                <button class="ig-unf-pro-secondary-btn" id="igProTestNotifModalBtn">
                  <span>${SVGS.bell}</span>
                  <span>Testar Alerta no Desktop</span>
                </button>
                <button class="ig-unf-pro-secondary-btn" id="igProOpenBlockFromModalBtn">
                  <span>${SVGS.block}</span>
                  <span>Checar Bloqueio por @</span>
                </button>
              </div>
            </div>
          ` : `
            <!-- Card de Oferta R$ 9,99 Vitalício no PIX -->
            <div class="ig-unf-pro-offer-card">
              <div class="ig-unf-pro-offer-badge">⚡ ACESSO VITALÍCIO PRO • PAGAMENTO ÚNICO</div>
              <div class="ig-unf-pro-offer-price-row">
                <span class="ig-unf-pro-old-price">De R$ 29,90</span>
                <span class="ig-unf-pro-new-price">R$ 9,99</span>
                <span class="ig-unf-pro-pix-tag">no PIX</span>
              </div>
              <p class="ig-unf-pro-offer-desc">Sem assinaturas ou mensalidades. Ao pagar no PIX, seu acesso é liberado instantaneamente.</p>
              <a href="${PRO_CHECKOUT_URL}" target="_blank" rel="noopener noreferrer" class="ig-unf-pro-checkout-btn" id="igProBuyBtn">
                <span>⚡ Pagar R$ 9,99 no PIX (Liberar PRO Imediato)</span>
              </a>
              <div class="ig-unf-pro-trust-badges">
                <span>✓ Liberação imediata</span>
                <span>✓ Vitalício para sempre</span>
                <span>✓ 100% Seguro</span>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(proModal);

    proModal.querySelector('#igProCloseBtn').addEventListener('click', () => proModal.remove());
    proModal.addEventListener('click', (e) => {
      if (e.target === proModal) proModal.remove();
    });

    if (isPro) {
      const notifSwitch = proModal.querySelector('#igProNotifSwitch');
      const testNotifBtn = proModal.querySelector('#igProTestNotifModalBtn');
      const openBlockBtn = proModal.querySelector('#igProOpenBlockFromModalBtn');

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_notifications_enabled'], (res) => {
          if (notifSwitch) notifSwitch.checked = res.ig_notifications_enabled !== false;
        });
      }

      if (notifSwitch) {
        notifSwitch.addEventListener('change', (e) => {
          chrome.storage.local.set({ ig_notifications_enabled: e.target.checked });
        });
      }

      if (testNotifBtn) {
        testNotifBtn.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'test_notification' });
          testNotifBtn.innerHTML = `<span>${SVGS.check}</span> <span>Enviado! ✓</span>`;
          setTimeout(() => {
            testNotifBtn.innerHTML = `<span>${SVGS.bell}</span> <span>Testar Alerta no Desktop</span>`;
          }, 2000);
        });
      }

      if (openBlockBtn) {
        openBlockBtn.addEventListener('click', () => {
          proModal.remove();
          openBlockCheckerModal();
        });
      }
    } else {
      const buyBtn = proModal.querySelector('#igProBuyBtn');
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          showToast('Abrindo checkout PIX seguro...', 'info', 4000);
        });
      }
    }
  }

  // Modal Central de Bloqueios (Quem Me Bloqueou + Quem Eu Bloqueei)
  async function openBlockCheckerModal(defaultUsername = '') {
    const existing = document.getElementById('igBlockCheckerModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'ig-unf-pro-overlay';
    modal.id = 'igBlockCheckerModal';

    const initialBlocked = await getBlockedByUsers();

    modal.innerHTML = `
      <div class="ig-unf-block-dialog" role="dialog" aria-modal="true" aria-labelledby="igBlockTitle">
        <div class="ig-unf-block-dialog-header">
          <div class="ig-unf-block-hero-badge">${SVGS.block}</div>
          <div class="ig-unf-block-dialog-title" id="igBlockTitle">Central de Bloqueios</div>
          <div class="ig-unf-block-dialog-subtitle">
            Descubra quem te bloqueou e gerencie contas bloqueadas no seu perfil.
          </div>
          <button class="ig-unf-close-btn ig-unf-block-close" id="igBlockCloseBtn" aria-label="Fechar">${SVGS.close}</button>
        </div>

        <div class="ig-unf-block-tabs">
          <button class="ig-unf-block-tab-btn active" id="igTabBtnBlockedBy">
            <span>🚨 Quem Me Bloqueou</span>
            <span class="ig-unf-block-tab-badge" id="igBlockedByCountBadge">${initialBlocked.length}</span>
          </button>
          <button class="ig-unf-block-tab-btn" id="igTabBtnBlockedMe">
            <span>🚫 Quem Eu Bloqueei</span>
            <span class="ig-unf-block-tab-badge blue" id="igBlockedMeCountBadge">...</span>
          </button>
        </div>

        <!-- ABA 1: QUEM ME BLOQUEOU -->
        <div id="igPaneBlockedBy">
          <div class="ig-unf-block-input-box">
            <div class="ig-unf-block-input-group">
              <span class="ig-unf-at-prefix">@</span>
              <input type="text" class="ig-unf-block-input" id="igBlockUserInput" placeholder="usuario_do_instagram" value="${defaultUsername}">
              <button class="ig-unf-block-submit-btn" id="igBlockSubmitBtn">
                <span>${SVGS.search}</span>
                <span>Verificar</span>
              </button>
            </div>
            <div class="ig-unf-block-hint">
              💡 Fazemos a prova real: comparamos o acesso autenticado da sua conta com o acesso público da web.
            </div>
          </div>

          <div id="igBlockResultContainer" class="ig-unf-block-result-area" style="display: none; margin-bottom: 14px;"></div>

          <div class="ig-unf-block-section-title">
            <span>📋 Bloqueios Confirmados</span>
            <span id="igBlockedByCounterText">${initialBlocked.length} perfil(is)</span>
          </div>
          <div id="igBlockedByListContainer" class="ig-unf-block-list"></div>
        </div>

        <!-- ABA 2: QUEM EU BLOQUEEI -->
        <div id="igPaneBlockedMe" style="display: none;">
          <div id="igBlockedMeLoading" class="ig-unf-block-loading">
            <div class="ig-unf-spinner-sm"></div>
            <span>Carregando sua lista de bloqueados no Instagram...</span>
          </div>
          <div id="igBlockedMeListContainer" class="ig-unf-block-list" style="display: none;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Sincronização em tempo real quando as contas bloqueadas forem detectadas em segundo plano ou em outra aba
    const handleStorageUpdate = (changes, area) => {
      if (area === 'local' && changes.ig_blocked_by_me_cache) {
        const newUsers = changes.ig_blocked_by_me_cache.newValue;
        if (Array.isArray(newUsers)) {
          blockedMeBadge.textContent = newUsers.length;
          if (paneBlockedMe && paneBlockedMe.style.display !== 'none') {
            loadBlockedMeTab(false);
          }
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageUpdate);
    }

    let blockSyncBc = null;
    try {
      blockSyncBc = new BroadcastChannel('ig_blocked_sync');
      blockSyncBc.onmessage = (e) => {
        if (e.data && e.data.type === 'SYNC_BLOCKED' && Array.isArray(e.data.users)) {
          blockedMeBadge.textContent = e.data.users.length;
          if (paneBlockedMe && paneBlockedMe.style.display !== 'none') {
            loadBlockedMeTab(false);
          }
        }
      };
    } catch (e) {}

    const cleanupModal = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageUpdate);
      }
      if (blockSyncBc) {
        try { blockSyncBc.close(); } catch (e) {}
      }
      modal.remove();
    };

    modal.querySelector('#igBlockCloseBtn').addEventListener('click', cleanupModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cleanupModal();
    });

    const tabBtnBlockedBy = modal.querySelector('#igTabBtnBlockedBy');
    const tabBtnBlockedMe = modal.querySelector('#igTabBtnBlockedMe');
    const paneBlockedBy = modal.querySelector('#igPaneBlockedBy');
    const paneBlockedMe = modal.querySelector('#igPaneBlockedMe');
    const blockedByBadge = modal.querySelector('#igBlockedByCountBadge');
    const blockedMeBadge = modal.querySelector('#igBlockedMeCountBadge');
    const blockedByListContainer = modal.querySelector('#igBlockedByListContainer');
    const blockedByCounterText = modal.querySelector('#igBlockedByCounterText');

    // Preenche imediatamente a badge de bloqueados com o cache local se existir
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ig_blocked_by_me_cache'], data => {
        if (data && Array.isArray(data.ig_blocked_by_me_cache)) {
          blockedMeBadge.textContent = data.ig_blocked_by_me_cache.length;
        }
      });
    }

    const input = modal.querySelector('#igBlockUserInput');
    const submitBtn = modal.querySelector('#igBlockSubmitBtn');
    const resultBox = modal.querySelector('#igBlockResultContainer');

    // Alternância de Abas
    tabBtnBlockedBy.addEventListener('click', () => {
      tabBtnBlockedBy.classList.add('active');
      tabBtnBlockedMe.classList.remove('active');
      paneBlockedBy.style.display = 'block';
      paneBlockedMe.style.display = 'none';
    });

    tabBtnBlockedMe.addEventListener('click', () => {
      tabBtnBlockedMe.classList.add('active');
      tabBtnBlockedBy.classList.remove('active');
      paneBlockedBy.style.display = 'none';
      paneBlockedMe.style.display = 'block';
      loadBlockedMeTab();
    });

    // Renderiza lista de "Quem Me Bloqueou"
    async function renderBlockedByList() {
      const items = await getBlockedByUsers();
      blockedByBadge.textContent = items.length;
      if (blockedByCounterText) {
        blockedByCounterText.textContent = `${items.length} perfil(is)`;
      }

      if (items.length === 0) {
        blockedByListContainer.innerHTML = `
          <div class="ig-unf-block-empty-state">
            <span style="font-size: 26px; display: block; margin-bottom: 6px;">🛡️</span>
            <strong style="color: #f4f4f5; display: block; margin-bottom: 4px;">Nenhum bloqueio registrado ainda</strong>
            <span>Toda vez que a extensão detectar que um seguidor sumido te bloqueou, ou quando você verificar um perfil manualmente, ele será listado aqui.</span>
          </div>
        `;
        return;
      }

      blockedByListContainer.innerHTML = '';
      items.forEach(user => {
        const itemEl = document.createElement('div');
        itemEl.className = 'ig-unf-block-list-item';

        const dateStr = user.detectedAt ? new Date(user.detectedAt).toLocaleDateString('pt-BR') : 'Hoje';

        itemEl.innerHTML = `
          <div class="ig-unf-block-item-left">
            <img src="${user.avatar || 'https://www.instagram.com/static/images/ico/favicon.ico'}" alt="@${user.username}" class="ig-unf-block-item-avatar blocked-ring" referrerpolicy="no-referrer" onerror="this.src='https://www.instagram.com/static/images/ico/favicon.ico'">
            <div class="ig-unf-block-item-info">
              <span class="ig-unf-block-item-user">@${user.username} ${user.fullName ? `• <span style="font-weight: 400; color: #a1a1aa;">${user.fullName}</span>` : ''}</span>
              <div class="ig-unf-block-item-sub">
                <span style="color: #ef4444; font-weight: 600;">🚨 Te Bloqueou</span>
                <span>• Detectado em ${dateStr}</span>
                ${user.followers ? `<span>• 👥 ${user.followers}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="ig-unf-block-item-actions">
            <button class="ig-unf-block-item-btn recheck" data-action="recheck" title="Re-checar se o perfil continua te bloqueando">
              ${SVGS.refresh} <span>Re-checar</span>
            </button>
            <a href="https://www.instagram.com/${user.username}/" target="_blank" rel="noopener" class="ig-unf-block-item-btn" title="Abrir Perfil">
              ${SVGS.externalLink}
            </a>
            <button class="ig-unf-block-item-btn remove" data-action="remove" title="Remover da lista">
              ${SVGS.close}
            </button>
          </div>
        `;

        itemEl.querySelector('[data-action="recheck"]').addEventListener('click', () => {
          input.value = user.username;
          tabBtnBlockedBy.click();
          runCheck();
        });

        itemEl.querySelector('[data-action="remove"]').addEventListener('click', async () => {
          await removeBlockedByUser(user.username);
          renderBlockedByList();
        });

        blockedByListContainer.appendChild(itemEl);
      });
    }

    // Carrega aba "Quem Eu Bloqueei"
    let blockedMeLoaded = false;
    async function loadBlockedMeTab(forceRefresh = false) {
      if (blockedMeLoaded && !forceRefresh) return;
      const loading = modal.querySelector('#igBlockedMeLoading');
      const container = modal.querySelector('#igBlockedMeListContainer');

      loading.style.display = 'flex';
      container.style.display = 'none';

      const res = await fetchBlockedByMe(forceRefresh);
      loading.style.display = 'none';
      container.style.display = 'flex';
      blockedMeLoaded = true;

      const users = res.users || [];
      blockedMeBadge.textContent = users.length;

      if (!res.success || users.length === 0) {
        container.innerHTML = `
          <div class="ig-unf-block-empty-state">
            <span style="font-size: 26px; display: block; margin-bottom: 6px;">🛡️</span>
            <strong style="color: #f4f4f5; display: block; margin-bottom: 4px;">Sincronização de Contas Bloqueadas</strong>
            <span style="font-size: 12px; color: #a1a1aa; line-height: 1.5; display: block; margin-bottom: 14px; max-width: 380px;">
              ${res.success && users.length === 0 ? 'Você não possui nenhuma conta bloqueada no Instagram.' : (res.message || 'Sincronize com a página oficial de contas bloqueadas do Instagram com 1 clique.')}
            </span>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button id="igRetryBlockedMeBtn" class="ig-unf-block-item-btn" style="background: rgba(255,255,255,0.08); padding: 7px 14px; border-radius: 8px; color: #fff; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
                ${SVGS.refresh} <span>Sincronizar Agora</span>
              </button>
              <a href="https://www.instagram.com/accounts/blocked_accounts/" target="_blank" rel="noopener" class="ig-unf-block-item-btn" style="background: #3b82f6; padding: 7px 14px; border-radius: 8px; color: #fff; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                <span>🔗 Abrir Bloqueados no Instagram</span>
              </a>
            </div>
          </div>
        `;
        const retryBtn = container.querySelector('#igRetryBlockedMeBtn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => loadBlockedMeTab(true));
        }
        return;
      }

      container.innerHTML = `
        <div class="ig-unf-block-section-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>👥 Contas Bloqueadas por Você</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span>${users.length} conta(s)</span>
            <button id="igRefreshBlockedMeListBtn" style="background: transparent; border: none; color: #a1a1aa; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;" title="Recarregar e sincronizar">
              ${SVGS.refresh} <span>Sincronizar</span>
            </button>
          </div>
        </div>
      `;

      const listRefreshBtn = container.querySelector('#igRefreshBlockedMeListBtn');
      if (listRefreshBtn) {
        listRefreshBtn.addEventListener('click', () => loadBlockedMeTab(true));
      }

      const defaultAvatar = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

      users.forEach(u => {
        const uid = String(u.pk || u.id || '');
        const itemEl = document.createElement('div');
        itemEl.className = 'ig-unf-block-list-item';

        let displayFullName = u.full_name || '';
        if (!displayFullName || displayFullName.toLowerCase().includes('inclui outras') || displayFullName.toLowerCase() === u.username.toLowerCase()) {
          displayFullName = 'Conta Bloqueada';
        }

        itemEl.innerHTML = `
          <div class="ig-unf-block-item-left">
            <img src="${u.profile_pic_url || defaultAvatar}" alt="@${u.username}" class="ig-unf-block-item-avatar" referrerpolicy="no-referrer" onerror="this.src='${defaultAvatar}'">
            <div class="ig-unf-block-item-info">
              <span class="ig-unf-block-item-user">@${u.username}</span>
              <div class="ig-unf-block-item-sub">
                <span>${displayFullName}</span>
                ${u.is_private ? '<span>• 🔒 Privado</span>' : ''}
              </div>
            </div>
          </div>
          <div class="ig-unf-block-item-actions">
            <button class="ig-unf-block-item-btn unblock" data-action="unblock" data-uid="${uid}" data-username="${u.username}">
              <span>Desbloquear</span>
            </button>
            <a href="https://www.instagram.com/${u.username}/" target="_blank" rel="noopener" class="ig-unf-block-item-btn" title="Abrir Perfil">
              ${SVGS.externalLink}
            </a>
          </div>
        `;

        const unblockBtn = itemEl.querySelector('[data-action="unblock"]');
        unblockBtn.addEventListener('click', async () => {
          unblockBtn.disabled = true;
          unblockBtn.innerHTML = `<div class="ig-unf-spinner-sm"></div> <span>Desbloqueando...</span>`;
          const ok = await unblockUserApi(uid, u.username);
          if (ok) {
            unblockBtn.className = 'ig-unf-block-item-btn unblocked-done';
            unblockBtn.innerHTML = `<span>Desbloqueado ✓</span>`;
            const currentCount = parseInt(blockedMeBadge.textContent, 10);
            if (!isNaN(currentCount) && currentCount > 0) {
              blockedMeBadge.textContent = currentCount - 1;
            }
            setTimeout(() => {
              itemEl.style.transition = 'all 0.3s ease';
              itemEl.style.opacity = '0';
              itemEl.style.transform = 'translateX(20px)';
              setTimeout(() => itemEl.remove(), 300);
            }, 800);
          } else {
            unblockBtn.disabled = false;
            unblockBtn.innerHTML = `<span>Tentar Novamente</span>`;
          }
        });

        container.appendChild(itemEl);
      });
    }

    // Inicializa a lista de "Quem Me Bloqueou"
    renderBlockedByList();

    // Executa a checagem manual
    async function runCheck() {
      const u = input.value.trim().replace(/^@/, '');
      if (!u) {
        input.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="ig-unf-spinner-sm"></div> <span>Testando...</span>`;
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div class="ig-unf-block-loading">
          <div class="ig-unf-spinner-sm"></div>
          <span>Analisando perfil @${u} (Sessão Logada vs. Web Pública)...</span>
        </div>
      `;

      const result = await checkUserBlockStatus(u);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>${SVGS.search}</span> <span>Verificar</span>`;

      if (result.status === 'blocked') {
        const d = result.details || {};
        resultBox.innerHTML = `
          <div class="ig-unf-block-card is-blocked">
            <div class="ig-unf-block-card-header">
              <div class="ig-unf-block-avatar-wrap">
                ${d.avatar ? `
                  <img src="${d.avatar}" alt="@${u}" class="ig-unf-block-avatar" referrerpolicy="no-referrer" onerror="this.style.opacity='0'">
                  <span class="ig-unf-block-avatar-badge is-blocked">${SVGS.block}</span>
                ` : `
                  <div class="ig-unf-block-avatar-wrap placeholder">${SVGS.block}</div>
                `}
              </div>
              <div class="ig-unf-block-header-text">
                <strong class="ig-unf-block-card-title">🚨 TE BLOQUEOU!</strong>
                <span class="ig-unf-block-user-handle">@${u}</span>
              </div>
            </div>
            <p class="ig-unf-block-card-desc">
              A conta <strong>@${u}</strong> existe normalmente e está ativa na web pública, mas está completamente <strong>inacessível para o seu perfil</strong>.
            </p>
            ${(d.followers !== undefined || d.isPrivate !== undefined) ? `
              <div class="ig-unf-block-meta-chips">
                ${d.isPrivate ? '<span class="ig-unf-meta-chip lock">🔒 Perfil Privado</span>' : '<span class="ig-unf-meta-chip pub">🌐 Perfil Público</span>'}
                ${d.followers !== undefined ? `<span class="ig-unf-meta-chip">👥 ${d.followers} seguidores</span>` : ''}
                ${d.following !== undefined ? `<span class="ig-unf-meta-chip">👣 ${d.following} seguindo</span>` : ''}
                ${d.posts !== undefined ? `<span class="ig-unf-meta-chip">📸 ${d.posts} posts</span>` : ''}
              </div>
            ` : ''}
            <div class="ig-unf-block-card-footer">
              <span class="ig-unf-status-pill blocked">Bloqueio Confirmado</span>
              <a href="https://www.instagram.com/${u}/" target="_blank" rel="noopener" class="ig-unf-link-btn">
                <span>Abrir Perfil</span>
                <span>${SVGS.externalLink}</span>
              </a>
            </div>
          </div>
        `;
        // Atualiza a lista de confirmados imediatamente
        renderBlockedByList();
      } else if (result.status === 'deactivated') {
        resultBox.innerHTML = `
          <div class="ig-unf-block-card is-deactivated">
            <div class="ig-unf-block-card-header">
              <div class="ig-unf-block-avatar-wrap placeholder">
                <span>${SVGS.userX}</span>
              </div>
              <div class="ig-unf-block-header-text">
                <strong class="ig-unf-block-card-title">⚪ Conta Desativada ou Inexistente</strong>
                <span class="ig-unf-block-user-handle">@${u}</span>
              </div>
            </div>
            <p class="ig-unf-block-card-desc">
              A conta <strong>@${u}</strong> não foi encontrada nem na web pública. A pessoa provavelmente desativou temporariamente, apagou a conta ou trocou de nome de usuário.
            </p>
            <div class="ig-unf-block-card-footer">
              <span class="ig-unf-status-pill deactivated">Desativada / Deletada</span>
            </div>
          </div>
        `;
      } else if (result.status === 'unfollow') {
        const d = result.details || {};
        resultBox.innerHTML = `
          <div class="ig-unf-block-card is-unfollow">
            <div class="ig-unf-block-card-header">
              <div class="ig-unf-block-avatar-wrap">
                ${d.avatar ? `
                  <img src="${d.avatar}" alt="@${u}" class="ig-unf-block-avatar" referrerpolicy="no-referrer" onerror="this.style.opacity='0'">
                  <span class="ig-unf-block-avatar-badge is-unfollow">${SVGS.userCheck}</span>
                ` : `
                  <div class="ig-unf-block-avatar-wrap placeholder">${SVGS.userCheck}</div>
                `}
              </div>
              <div class="ig-unf-block-header-text">
                <strong class="ig-unf-block-card-title">🟢 NÃO Te Bloqueou!</strong>
                <span class="ig-unf-block-user-handle">${d.fullName ? `${d.fullName} (@${u})` : `@${u}`}</span>
              </div>
            </div>
            <p class="ig-unf-block-card-desc">
              O perfil <strong>@${u}</strong> está <strong>acessível e visível normalmente</strong> para a sua conta. Se essa pessoa sumiu da sua lista de seguidores, foi apenas um unfollow normal.
            </p>
            ${(d.followers !== undefined || d.isPrivate !== undefined) ? `
              <div class="ig-unf-block-meta-chips">
                ${d.isPrivate ? '<span class="ig-unf-meta-chip lock">🔒 Perfil Privado</span>' : '<span class="ig-unf-meta-chip pub">🌐 Perfil Público</span>'}
                ${d.followers !== undefined ? `<span class="ig-unf-meta-chip">👥 ${d.followers} seguidores</span>` : ''}
                ${d.following !== undefined ? `<span class="ig-unf-meta-chip">👣 ${d.following} seguindo</span>` : ''}
                ${d.posts !== undefined ? `<span class="ig-unf-meta-chip">📸 ${d.posts} posts</span>` : ''}
              </div>
            ` : ''}
            <div class="ig-unf-block-card-footer">
              <span class="ig-unf-status-pill unfollow">Acesso Normal</span>
              <a href="https://www.instagram.com/${u}/" target="_blank" rel="noopener" class="ig-unf-link-btn">
                <span>Visitar Perfil</span>
                <span>${SVGS.externalLink}</span>
              </a>
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `
          <div class="ig-unf-block-card is-deactivated">
            <div class="ig-unf-block-card-header">
              <span class="ig-unf-block-card-icon">${SVGS.alert}</span>
              <strong class="ig-unf-block-card-title">Erro na Verificação</strong>
            </div>
            <p class="ig-unf-block-card-desc">${result.message || 'Verifique sua conexão ou tente novamente em alguns segundos.'}</p>
          </div>
        `;
      }
    }

    submitBtn.addEventListener('click', runCheck);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runCheck();
    });

    if (defaultUsername) {
      runCheck();
    }
  }

  // Tela Inicial
  function renderInitialView() {
    const body = overlay.querySelector('#igUnfBody');
    const userId = getLoggedInUserId();

    if (!userId) {
      body.innerHTML = `
        <div class="ig-unf-start-card">
          <div class="ig-unf-hero-icon">${SVGS.lock}</div>
          <div class="ig-unf-start-title">Conecte-se à sua conta</div>
          <p class="ig-unf-start-desc">
            Entre no Instagram nesta aba para que a extensão possa analisar sua lista de seguidores com segurança local, sem solicitar senhas.
          </p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="ig-unf-start-card">
        <div class="ig-unf-hero-icon">${SVGS.chart}</div>
        <div class="ig-unf-start-title">Descubra quem não te segue de volta</div>
        <p class="ig-unf-start-desc">
          <strong>Identificação gratuita e sem limites:</strong> varredura rápida e suave que lista quem não te segue, com botões diretos de ação e proteção anti-bloqueio.
        </p>
        <button class="ig-unf-primary-btn" id="igStartScanBtn">
          <span>${SVGS.play}</span>
          <span>Iniciar Análise ao Vivo</span>
        </button>
      </div>
    `;

    body.querySelector('#igStartScanBtn').addEventListener('click', startScan);
  }

  // Atualiza os contadores numéricos das abas
  function updateTabBadges() {
    const notBadge = overlay?.querySelector('[data-tab="notFollowingBack"] .ig-unf-tab-badge');
    const fansBadge = overlay?.querySelector('[data-tab="fans"] .ig-unf-tab-badge');
    const mutualBadge = overlay?.querySelector('[data-tab="mutual"] .ig-unf-tab-badge');
    const recentBadge = overlay?.querySelector('[data-tab="recentUnfollowers"] .ig-unf-tab-badge');
    const vipBadge = overlay?.querySelector('[data-tab="vip"] .ig-unf-tab-badge');

    if (notBadge) notBadge.textContent = scanResults.notFollowingBack.length;
    if (fansBadge) fansBadge.textContent = scanResults.fans.length;
    if (mutualBadge) mutualBadge.textContent = scanResults.mutual.length;
    if (recentBadge) recentBadge.textContent = scanResults.recentUnfollowers.length;
    if (vipBadge) vipBadge.textContent = vipWhitelist.size;
  }

  // -------------------------------------------------------------
  // SEGURANÇA OPERACIONAL: DESFAZER INDIVIDUAL (FLOATING UNDO TOAST 5s)
  // -------------------------------------------------------------
  const pendingUnfollows = new Map();

  function cancelPendingUnfollow(targetUserId, showFeedback = true) {
    const pending = pendingUnfollows.get(targetUserId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    clearInterval(pending.intervalId);

    if (pending.toastEl) {
      pending.toastEl.classList.add('ig-undo-closing');
      setTimeout(() => pending.toastEl.remove(), 200);
    }

    if (pending.btn) {
      pending.btn.className = pending.originalClass || 'ig-unf-unfollow-btn';
      pending.btn.innerHTML = pending.originalHtml || 'Deixar de Seguir';
      pending.btn.disabled = false;
      if (pending.originalStyle) {
        pending.btn.style.cssText = pending.originalStyle;
      }
    }

    pendingUnfollows.delete(targetUserId);

    if (showFeedback) {
      showToast('Ação cancelada', 'info', 2500);
    }
  }

  function commitPendingUnfollow(targetUserId) {
    const pending = pendingUnfollows.get(targetUserId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    clearInterval(pending.intervalId);

    if (pending.toastEl) {
      pending.toastEl.classList.add('ig-undo-closing');
      setTimeout(() => pending.toastEl.remove(), 200);
    }

    const { btn, username } = pending;
    pendingUnfollows.delete(targetUserId);

    unfollowUser(targetUserId, btn, username);
  }

  // Ação Individual de Deixar de Seguir com Buffer de 5s Reversível
  function handleUnfollow(targetUserId, btn, username) {
    // Se o usuário clicar no botão enquanto estiver em contagem regressiva, funciona como "Desfazer"
    if (pendingUnfollows.has(targetUserId)) {
      cancelPendingUnfollow(targetUserId, true);
      return;
    }

    // Se já havia outra contagem pendente com toast flutuante, comita a anterior imediatamente
    for (const otherUid of Array.from(pendingUnfollows.keys())) {
      commitPendingUnfollow(otherUid);
    }

    if (!username) {
      const card = btn?.closest('.ig-unf-user-card');
      username = card?.querySelector('.ig-unf-username')?.textContent?.replace(/[@\s]/g, '') || 'usuário';
    }

    const originalHtml = btn.innerHTML;
    const originalClass = btn.className;
    const originalStyle = btn.style.cssText;

    btn.className = `${originalClass} ig-unf-btn-pending`;
    btn.innerHTML = `<span>Cancelando... (<strong class="ig-btn-sec">5s</strong>)</span> <span class="ig-btn-undo-link">Desfazer</span>`;
    btn.disabled = false;

    const modal = overlay?.querySelector('.ig-unf-modal');
    let undoWrapper = modal?.querySelector('.ig-unf-undo-toast-wrapper');
    if (modal && !undoWrapper) {
      undoWrapper = document.createElement('div');
      undoWrapper.className = 'ig-unf-undo-toast-wrapper';
      modal.appendChild(undoWrapper);
    }

    let toast = null;
    if (undoWrapper) {
      undoWrapper.innerHTML = '';
      toast = document.createElement('div');
      toast.className = 'ig-unf-undo-toast';
      toast.innerHTML = `
        <div class="ig-unf-undo-toast-body">
          <div class="ig-unf-undo-toast-text" title="Deixando de seguir @${username}">
            <span class="ig-unf-undo-hourglass">⏳</span>
            <span>Deixando de seguir <strong>@${username}</strong> em <span class="ig-unf-countdown-badge">5s</span>...</span>
          </div>
          <button class="ig-unf-undo-toast-btn" type="button">Desfazer</button>
        </div>
        <div class="ig-unf-undo-progress-track">
          <div class="ig-unf-undo-progress-bar"></div>
        </div>
      `;
      undoWrapper.appendChild(toast);

      toast.querySelector('.ig-unf-undo-toast-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        cancelPendingUnfollow(targetUserId, true);
      });
    }

    const startTime = Date.now();
    const countdownBadge = toast?.querySelector('.ig-unf-countdown-badge');

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.max(1, Math.ceil((5000 - elapsed) / 1000));
      if (countdownBadge) countdownBadge.textContent = `${remainingSec}s`;
      const secEl = btn?.querySelector('.ig-btn-sec');
      if (secEl) secEl.textContent = `${remainingSec}s`;
    }, 250);

    const timeoutId = setTimeout(() => {
      commitPendingUnfollow(targetUserId);
    }, 5000);

    pendingUnfollows.set(targetUserId, {
      startTime,
      timeoutId,
      intervalId,
      toastEl: toast,
      btn,
      username,
      originalHtml,
      originalClass,
      originalStyle
    });
  }

  // Execução direta da requisição na API do Instagram após término do countdown
  async function unfollowUser(targetUserId, btn, username) {
    const targetBtn = btn || overlay?.querySelector(`[data-uid="${targetUserId}"] [data-action="unfollow"]`);
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.textContent = 'Deixando...';
    }

    const csrf = getCsrfToken();
    const headers = {
      'X-CSRFToken': csrf,
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      let res = await fetch(`/api/v1/web/friendships/${targetUserId}/unfollow/`, {
        method: 'POST',
        headers: headers,
        credentials: 'include'
      });

      if (res.status === 404) {
        res = await fetch(`/web/friendships/${targetUserId}/unfollow/`, {
          method: 'POST',
          headers: headers,
          credentials: 'include'
        });
      }

      if (res.ok) {
        if (targetBtn) {
          targetBtn.innerHTML = `${SVGS.check} <span>Deixou de seguir</span>`;
          targetBtn.style.background = '#27272a';
          targetBtn.style.borderColor = '#38383e';
          targetBtn.style.color = '#71717a';
          targetBtn.disabled = true;
        }
        if (selectedUids.has(targetUserId)) {
          selectedUids.delete(targetUserId);
          if (selectedUids.size === 0) {
            isBatchModeActive = false;
          }
          updateBatchButtonState();
        }
        showToast(`Você deixou de seguir @${username || 'o perfil'}.`, 'success', 3000);
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Erro ao deixar de seguir:', res.status, errText);
        if (targetBtn) {
          targetBtn.textContent = 'Tentar no perfil ↗';
          targetBtn.disabled = false;
          targetBtn.onclick = () => {
            window.open(`https://www.instagram.com/web/friendships/${targetUserId}/`, '_blank');
          };
        }
        showToast('Não foi possível deixar de seguir pelo Instagram.', 'error', 4000);
      }
    } catch (e) {
      console.error('Erro de rede ao deseguir:', e);
      if (targetBtn) {
        targetBtn.textContent = 'Erro de rede';
        targetBtn.disabled = false;
      }
      showToast('Erro de rede ao tentar deixar de seguir.', 'error', 4000);
    }
  }

  // Alias para retrocompatibilidade
  const executeUnfollow = unfollowUser;

  // Ação Individual de Seguir de Volta
  async function handleFollow(targetUserId, btn) {
    btn.disabled = true;
    btn.textContent = 'Seguindo...';

    const csrf = getCsrfToken();
    const headers = {
      'X-CSRFToken': csrf,
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      let res = await fetch(`/api/v1/web/friendships/${targetUserId}/follow/`, {
        method: 'POST',
        headers: headers,
        credentials: 'include'
      });

      if (res.status === 404) {
        res = await fetch(`/web/friendships/${targetUserId}/follow/`, {
          method: 'POST',
          headers: headers,
          credentials: 'include'
        });
      }

      if (res.ok) {
        btn.innerHTML = `${SVGS.check} <span>Seguindo</span>`;
        btn.style.background = '#059669';
        btn.style.color = '#ffffff';
        btn.disabled = true;
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Erro ao seguir:', res.status, errText);
        btn.textContent = 'Tentar de novo';
        btn.disabled = false;
      }
    } catch (e) {
      console.error('Erro de rede ao seguir:', e);
      btn.textContent = 'Erro de rede';
      btn.disabled = false;
    }
  }

  // -------------------------------------------------------------
  // SCANNER COM FEEDBACK AO VIVO E BOTÃO DE LIBERAÇÃO AOS 100
  // -------------------------------------------------------------
  async function startScan() {
    const userId = getLoggedInUserId();
    if (!userId) return;

    isScanning = true;
    shouldStopScan = false;
    isPhase1 = true;
    isEarlyReleased = false;
    selectedUids.clear();
    isBatchModeActive = false;

    scanResults = {
      notFollowingBack: [],
      fans: [],
      mutual: [],
      recentUnfollowers: []
    };
    currentTab = 'notFollowingBack';
    searchTerm = '';

    // Inicia na visão dedicada e centralizada da Fase 1 (Mapeamento de Seguidores)
    renderPhase1View();

    try {
      // FASE 1: Mapeamento de seguidores
      const followersMap = new Map();
      let cursor = null;
      let hasMore = true;

      while (hasMore && !shouldStopScan) {
        const url = `/api/v1/friendships/${userId}/followers/?count=100${cursor ? `&max_id=${cursor}` : ''}`;
        const res = await fetch(url, {
          headers: {
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 429) throw new Error('Limite temporário atingido. Aguarde alguns minutos.');
          throw new Error(`Erro na conexão com o Instagram (${res.status})`);
        }

        const data = await res.json();
        const batch = data.users || [];
        batch.forEach(u => {
          const key = String(u.pk || u.id || u.pk_id);
          followersMap.set(key, u);
        });

        updatePhase1Progress(followersMap.size, batch, () => {
          isEarlyReleased = true;
          hasMore = false;
        });

        cursor = data.next_max_id;
        hasMore = hasMore && !!cursor;

        if (hasMore && !shouldStopScan) {
          await sleep(320 + Math.random() * 80);
        }
      }

      if (shouldStopScan) {
        isScanning = false;
        isPhase1 = false;
        renderInitialView();
        return;
      }

      // Salva snapshot fiel com todos os seguidores antes do streaming da fase 2
      const allFollowersMap = new Map(followersMap);

      // FASE 2: Streaming dos que você segue
      isPhase1 = false;
      let followingCursor = null;
      let hasMoreFollowing = true;
      let totalFollowingChecked = 0;

      // Renderiza a casca completa de resultados para a liberação ao vivo
      renderResultsView(true);

      const streamingBanner = overlay.querySelector('#igStreamingBanner');
      const streamingText = overlay.querySelector('#igStreamingText');
      const stopBtn = overlay.querySelector('#igStopScanBtn');

      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          shouldStopScan = true;
          stopBtn.textContent = 'Parando...';
          stopBtn.disabled = true;
        });
      }

      const listElem = overlay.querySelector('#igUserList');
      if (listElem) listElem.innerHTML = '';

      if (isEarlyReleased) {
        let earlyBanner = overlay.querySelector('#igEarlyWarningBanner');
        if (!earlyBanner) {
          earlyBanner = document.createElement('div');
          earlyBanner.id = 'igEarlyWarningBanner';
          earlyBanner.className = 'ig-unf-warning-banner';
          earlyBanner.innerHTML = `${SVGS.alert} <span><strong>Modo Antecipado:</strong> Você liberou a lista com ${followersMap.size} seguidores mapeados. Amigos fora dessa amostra podem aparecer temporariamente como não-seguidores. Sempre verifique o perfil antes de dar unfollow.</span>`;
          const toolbar = overlay.querySelector('.ig-unf-toolbar');
          if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(earlyBanner, toolbar.nextSibling);
          }
        }
      }

      while (hasMoreFollowing && !shouldStopScan) {
        const url = `/api/v1/friendships/${userId}/following/?count=100${followingCursor ? `&max_id=${followingCursor}` : ''}`;
        const res = await fetch(url, {
          headers: {
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 429) throw new Error('Limite temporário atingido. Aguarde alguns minutos.');
          throw new Error(`Erro na busca (${res.status})`);
        }

        const data = await res.json();
        const batch = data.users || [];
        totalFollowingChecked += batch.length;

        batch.forEach(u => {
          const key = String(u.pk || u.id || u.pk_id);
          if (!followersMap.has(key)) {
            scanResults.notFollowingBack.push(u);
          } else {
            scanResults.mutual.push(u);
            followersMap.delete(key);
          }
        });

        if (streamingText) {
          streamingText.textContent = `Liberando ao vivo: ${totalFollowingChecked} analisados (${scanResults.notFollowingBack.length} não te seguem)...`;
        }
        updateTabBadges();
        renderUserListIncremental();

        followingCursor = data.next_max_id;
        hasMoreFollowing = !!followingCursor;

        if (hasMoreFollowing && !shouldStopScan) {
          await sleep(400 + Math.random() * 120);
        }
      }

      // FASE 3: Finalização e Comparação de Histórico de Unfollows
      scanResults.fans = Array.from(followersMap.values());
      const lost = await computeRecentUnfollowers(allFollowersMap);
      scanResults.recentUnfollowers = lost;

      // Se for PRO e houver unfollows detectados, dispara notificação na área de trabalho
      if (isPro && lost.length > 0) {
        chrome.runtime.sendMessage({
          action: 'trigger_desktop_notification',
          title: '🔔 Instagram: Novos Unfollows Detectados',
          message: lost.length === 1
            ? `@${lost[0].username} deixou de seguir seu perfil.`
            : `${lost.length} pessoas deixaram de te seguir desde a última checagem.`
        });
      }

      updateTabBadges();
      isScanning = false;

      if (streamingBanner) {
        streamingBanner.style.background = '#064e3b';
        streamingBanner.style.borderColor = '#059669';
        streamingBanner.innerHTML = `
          <div class="ig-unf-streaming-info">
            <span>${SVGS.check}</span>
            <span><strong>Concluído:</strong> ${scanResults.notFollowingBack.length} pessoas não te seguem de volta.</span>
          </div>
        `;
        setTimeout(() => {
          streamingBanner.style.display = 'none';
        }, 5000);
      }

    } catch (err) {
      isScanning = false;
      isPhase1 = false;
      showToast(`Erro durante a análise: ${err.message}`, 'error', 5000);
      renderInitialView();
    }
  }

  // -------------------------------------------------------------
  // RENDERIZAÇÃO DA CASCA DE RESULTADOS E ABAS
  // -------------------------------------------------------------
  function renderResultsView(isStreaming = false) {
    const body = overlay.querySelector('#igUnfBody');

    body.innerHTML = `
      <div id="igStreamingBanner" class="ig-unf-streaming-banner" style="${isStreaming ? '' : 'display: none;'}">
        <div class="ig-unf-streaming-info">
          <div class="ig-unf-pulse-dot"></div>
          <span id="igStreamingText">Conectando e iniciando liberação ao vivo...</span>
        </div>
        <button class="ig-unf-stop-btn" id="igStopScanBtn">
          <span>${SVGS.stop}</span>
          <span>Parar</span>
        </button>
      </div>

      <div class="ig-unf-tabs" role="tablist">
        <button class="ig-unf-tab-btn ${currentTab === 'notFollowingBack' ? 'active' : ''}" data-tab="notFollowingBack" role="tab">
          <span>Não me seguem</span>
          <span class="ig-unf-tab-badge">${scanResults.notFollowingBack.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'fans' ? 'active' : ''}" data-tab="fans" role="tab">
          <span>Fãs</span>
          <span class="ig-unf-tab-badge">${scanResults.fans.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'mutual' ? 'active' : ''}" data-tab="mutual" role="tab">
          <span>Mútuos</span>
          <span class="ig-unf-tab-badge">${scanResults.mutual.length}</span>
        </button>
        <button class="ig-unf-tab-btn alert-tab ${currentTab === 'recentUnfollowers' ? 'active' : ''}" data-tab="recentUnfollowers" role="tab" title="Pessoas que deixaram de seguir o seu perfil">
          ${SVGS.alert}
          <span>Unfollows</span>
          <span class="ig-unf-tab-badge alert-badge">${scanResults.recentUnfollowers.length}</span>
        </button>
        <button class="ig-unf-tab-btn vip-tab ${currentTab === 'vip' ? 'active' : ''}" data-tab="vip" role="tab">
          ${SVGS.star}
          <span>VIPs</span>
          <span class="ig-unf-tab-badge vip-badge">${vipWhitelist.size}</span>
        </button>
      </div>

      <div class="ig-unf-toolbar">
        <div class="ig-unf-search-wrapper">
          <span class="ig-unf-search-icon">${SVGS.search}</span>
          <input type="text" class="ig-unf-search-input" id="igSearchInput" placeholder="Pesquisar @arroba ou nome..." value="${searchTerm}" aria-label="Pesquisar perfis">
        </div>
        <button type="button" class="ig-unf-batch-toggle-btn ${selectedUids.size > 0 || isBatchModeActive ? 'active' : ''}" id="igBatchToggleBtn" title="Ativar ou ocultar seleção em lote" aria-pressed="${selectedUids.size > 0 || isBatchModeActive ? 'true' : 'false'}" style="${currentTab === 'notFollowingBack' ? 'display: flex;' : 'display: none;'}">
          <span>${SVGS.checkSquare}</span>
          <span>Selecionar</span>
        </button>
        <div class="ig-unf-export-dropdown-wrapper" id="igExportDropdownWrapper">
          <button type="button" class="ig-unf-export-btn ig-unf-export-dropdown-btn" id="igExportDropdownBtn" aria-haspopup="true" aria-expanded="false" title="Opções de exportação">
            <span>${SVGS.download}</span>
            <span>Exportar</span>
            <span class="ig-unf-dropdown-arrow">${SVGS.chevronDown}</span>
          </button>
          <div class="ig-unf-export-menu" id="igExportMenu" role="menu" aria-label="Opções de exportação">
            <button type="button" class="ig-unf-export-item" id="igExportTxt" role="menuitem">
              <span class="ig-unf-export-item-icon">${SVGS.fileText}</span>
              <div class="ig-unf-export-item-text">
                <span class="ig-unf-export-item-title">Exportar como TXT</span>
                <span class="ig-unf-export-item-desc">Lista simples de @arrobas</span>
              </div>
            </button>
            <button type="button" class="ig-unf-export-item" id="igExportCsv" role="menuitem">
              <span class="ig-unf-export-item-icon">${SVGS.fileSpreadsheet}</span>
              <div class="ig-unf-export-item-text">
                <span class="ig-unf-export-item-title">Exportar como CSV</span>
                <span class="ig-unf-export-item-desc">Planilha estruturada (Excel)</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="ig-unf-batch-bar ${currentTab === 'notFollowingBack' && (selectedUids.size > 0 || isBatchModeActive) ? 'visible' : ''}" id="igBatchBar" style="${currentTab === 'notFollowingBack' ? 'display: flex;' : 'display: none;'}">
        <div class="ig-unf-batch-select-group">
          <span class="ig-unf-batch-label">Seleção:</span>
          <button type="button" class="ig-unf-batch-chip" data-batch="10">+10</button>
          <button type="button" class="ig-unf-batch-chip" data-batch="25">+25</button>
          <button type="button" class="ig-unf-batch-chip" data-batch="all">Todos</button>
          <button type="button" class="ig-unf-batch-chip text" data-batch="clear">Limpar</button>
        </div>
        <button type="button" class="ig-unf-batch-run-btn" id="igBatchRunBtn" ${selectedUids.size === 0 ? 'disabled' : ''}>
          <span>${SVGS.trash}</span>
          <span id="igBatchRunText">Deseguir Selecionados (${selectedUids.size})</span>
        </button>
      </div>

      <div id="igBatchQueueBanner" class="ig-unf-batch-queue-banner" style="display: none;"></div>

      <div class="ig-unf-user-list" id="igUserList"></div>
    `;

    // Limpeza de listeners anteriores do menu de exportação se houver re-render
    if (activeExportMenuCleanup) {
      activeExportMenuCleanup();
      activeExportMenuCleanup = null;
    }

    // Exportação com Menu Dropdown Compacto
    const exportDropdownWrapper = body.querySelector('#igExportDropdownWrapper');
    const exportDropdownBtn = body.querySelector('#igExportDropdownBtn');
    const exportMenu = body.querySelector('#igExportMenu');

    function closeExportDropdown() {
      if (exportMenu) exportMenu.classList.remove('open');
      if (exportDropdownBtn) {
        exportDropdownBtn.classList.remove('open');
        exportDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    }

    function toggleExportDropdown(e) {
      e.stopPropagation();
      const isOpen = exportMenu?.classList.contains('open');
      if (isOpen) {
        closeExportDropdown();
      } else {
        exportMenu?.classList.add('open');
        exportDropdownBtn?.classList.add('open');
        exportDropdownBtn?.setAttribute('aria-expanded', 'true');
      }
    }

    if (exportDropdownBtn) {
      exportDropdownBtn.addEventListener('click', toggleExportDropdown);
    }

    const exportTxtBtn = body.querySelector('#igExportTxt');
    if (exportTxtBtn) {
      exportTxtBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeExportDropdown();
        exportData('txt');
      });
    }

    const exportCsvBtn = body.querySelector('#igExportCsv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeExportDropdown();
        exportData('csv');
      });
    }

    // Fechar dropdown ao clicar fora ou ao pressionar Escape
    const handleOutsideClick = (e) => {
      const wrapper = overlay?.querySelector('#igExportDropdownWrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeExportDropdown();
      }
    };
    document.addEventListener('click', handleOutsideClick);

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && exportMenu?.classList.contains('open')) {
        closeExportDropdown();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleEscapeKey);

    activeExportMenuCleanup = () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };

    // Alternar modo de seleção em lote via botão da toolbar
    const batchToggleBtn = body.querySelector('#igBatchToggleBtn');
    if (batchToggleBtn) {
      batchToggleBtn.addEventListener('click', () => {
        if (isBatchModeActive || selectedUids.size > 0) {
          isBatchModeActive = false;
          selectedUids.clear();
          syncCardCheckboxes();
        } else {
          isBatchModeActive = true;
        }
        updateBatchButtonState();
      });
    }

    // Eventos das abas
    body.querySelectorAll('.ig-unf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        body.querySelectorAll('.ig-unf-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        closeExportDropdown();
        updateBatchButtonState();
        renderUserListFull();
      });
    });

    // Pesquisa
    const searchInput = body.querySelector('#igSearchInput');
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderUserListFull();
    });

    // Configuração dos botões de lote
    setupBatchControls();

    updateBatchButtonState();
    renderUserListFull();
  }

  // -------------------------------------------------------------
  // CONTROLES DE DESEGUIR EM MASSA (BATCH UNFOLLOW)
  // -------------------------------------------------------------
  function setupBatchControls() {
    const bar = overlay.querySelector('#igBatchBar');
    if (!bar) return;

    bar.querySelectorAll('.ig-unf-batch-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-batch');
        const list = scanResults.notFollowingBack.filter(u => {
          const uid = String(u.pk || u.id || u.pk_id);
          return !vipWhitelist.has(uid);
        });

        if (type === 'clear') {
          selectedUids.clear();
          isBatchModeActive = false;
        } else if (type === 'all') {
          list.forEach(u => selectedUids.add(String(u.pk || u.id || u.pk_id)));
          isBatchModeActive = true;
        } else {
          const count = parseInt(type, 10);
          list.slice(0, count).forEach(u => selectedUids.add(String(u.pk || u.id || u.pk_id)));
          isBatchModeActive = true;
        }
        updateBatchButtonState();
        syncCardCheckboxes();
      });
    });

    const runBtn = bar.querySelector('#igBatchRunBtn');
    runBtn.addEventListener('click', promptBatchUnfollow);
  }

  // Intercepta o clique do deseguir em massa para exibir confirmação segura
  function promptBatchUnfollow() {
    if (selectedUids.size === 0 || isBatchRunning) return;

    // Usuário gratuito: aviso caso tente mais de 3 em lote
    if (!isPro && selectedUids.size > 3) {
      openProModal();
      return;
    }

    openBatchConfirmModal();
  }

  // Modal de Confirmação Dark Mode para Ação em Lote (Harden Pass)
  function openBatchConfirmModal() {
    const existing = overlay?.querySelector('#igBatchConfirmOverlay');
    if (existing) existing.remove();

    const count = selectedUids.size;
    const confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'ig-unf-confirm-overlay';
    confirmOverlay.id = 'igBatchConfirmOverlay';

    confirmOverlay.innerHTML = `
      <div class="ig-unf-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="igBatchConfirmTitle">
        <div class="ig-unf-confirm-header">
          <div class="ig-unf-confirm-icon-badge">${SVGS.alert}</div>
          <div class="ig-unf-confirm-title" id="igBatchConfirmTitle">⚠️ Confirmar Ação em Lote</div>
        </div>
        <div class="ig-unf-confirm-body">
          <p class="ig-unf-confirm-subtitle">
            Você está prestes a deixar de seguir <strong>${count}</strong> ${count === 1 ? 'perfil selecionado' : 'perfis selecionados'}.
          </p>
          <div class="ig-unf-confirm-notice">
            <span class="ig-unf-confirm-notice-icon">${SVGS.shield}</span>
            <span>As pausas antibloqueio (8 a 13s) serão ativadas para proteger sua conta.</span>
          </div>
        </div>
        <div class="ig-unf-confirm-actions">
          <button class="ig-unf-confirm-btn cancel" id="igBatchConfirmCancel" type="button">Cancelar</button>
          <button class="ig-unf-confirm-btn confirm" id="igBatchConfirmProceed" type="button">
            ${SVGS.trash}
            <span>Sim, iniciar unfollows</span>
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(confirmOverlay);

    const closeConfirm = () => {
      confirmOverlay.classList.add('ig-fade-out');
      setTimeout(() => confirmOverlay.remove(), 180);
      document.removeEventListener('keydown', handleKey);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') closeConfirm();
    };
    document.addEventListener('keydown', handleKey);

    confirmOverlay.querySelector('#igBatchConfirmCancel').addEventListener('click', closeConfirm);
    confirmOverlay.addEventListener('click', (e) => {
      if (e.target === confirmOverlay) closeConfirm();
    });

    confirmOverlay.querySelector('#igBatchConfirmProceed').addEventListener('click', () => {
      closeConfirm();
      startBatchUnfollow();
    });
  }

  // Alias para retrocompatibilidade e especificação
  function startBatchUnfollow() {
    return startBatchExecution();
  }

  function updateBatchButtonState() {
    const runBtn = overlay?.querySelector('#igBatchRunBtn');
    const text = overlay?.querySelector('#igBatchRunText');
    const bar = overlay?.querySelector('#igBatchBar');
    const toggleBtn = overlay?.querySelector('#igBatchToggleBtn');

    const count = selectedUids.size;

    if (text) {
      text.textContent = `Deseguir Selecionados (${count})`;
    }
    if (runBtn) {
      runBtn.disabled = count === 0 || isBatchRunning;
    }

    const shouldShowBar = currentTab === 'notFollowingBack' && (count > 0 || isBatchModeActive);

    if (bar) {
      if (currentTab === 'notFollowingBack' && shouldShowBar) {
        bar.style.display = 'flex';
        bar.classList.add('visible');
      } else {
        bar.classList.remove('visible');
        bar.style.display = 'none';
      }
    }

    if (toggleBtn) {
      if (currentTab === 'notFollowingBack') {
        toggleBtn.style.display = 'flex';
        if (shouldShowBar) {
          toggleBtn.classList.add('active');
          toggleBtn.setAttribute('aria-pressed', 'true');
        } else {
          toggleBtn.classList.remove('active');
          toggleBtn.setAttribute('aria-pressed', 'false');
        }
      } else {
        toggleBtn.style.display = 'none';
      }
    }
  }

  function syncCardCheckboxes() {
    const listElem = overlay?.querySelector('#igUserList');
    if (!listElem) return;

    listElem.querySelectorAll('.ig-unf-card-checkbox').forEach(cb => {
      const uid = cb.getAttribute('data-uid');
      cb.checked = selectedUids.has(uid);
    });
  }

  // Executa a fila de deseguir em massa com atraso humanizado
  async function startBatchExecution() {
    if (selectedUids.size === 0) return;

    // Usuário gratuito: aviso caso tente mais de 3 em lote
    if (!isPro && selectedUids.size > 3) {
      openProModal();
      return;
    }

    const queueBanner = overlay.querySelector('#igBatchQueueBanner');
    const targetUids = Array.from(selectedUids);
    isBatchRunning = true;
    shouldStopBatch = false;
    updateBatchButtonState();

    if (queueBanner) {
      queueBanner.style.display = 'flex';
    }

    let processed = 0;
    for (const uid of targetUids) {
      if (shouldStopBatch) break;

      const userObj = scanResults.notFollowingBack.find(u => String(u.pk || u.id || u.pk_id) === uid);
      const username = userObj ? userObj.username : uid;

      if (queueBanner) {
        queueBanner.innerHTML = `
          <div class="ig-unf-queue-info">
            <div class="ig-unf-spinner-sm"></div>
            <span>Deseguindo <strong>@${username}</strong> (${processed + 1} de ${targetUids.length})...</span>
          </div>
          <button class="ig-unf-stop-btn" id="igStopBatchBtn">
            <span>${SVGS.stop}</span>
            <span>Cancelar</span>
          </button>
        `;
        queueBanner.querySelector('#igStopBatchBtn').addEventListener('click', () => {
          shouldStopBatch = true;
        });
      }

      // Executa o unfollow
      const card = overlay.querySelector(`[data-uid="${uid}"]`);
      const btn = card?.querySelector('[data-action="unfollow"]');
      if (btn) btn.textContent = 'Deseguindo...';

      const csrf = getCsrfToken();
      const headers = {
        'X-CSRFToken': csrf,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      try {
        let res = await fetch(`/api/v1/web/friendships/${uid}/unfollow/`, {
          method: 'POST',
          headers: headers,
          credentials: 'include'
        });
        if (res.status === 404) {
          res = await fetch(`/web/friendships/${uid}/unfollow/`, { method: 'POST', headers, credentials: 'include' });
        }

        if (res.ok && btn) {
          btn.innerHTML = `${SVGS.check} <span>Deixou</span>`;
          btn.disabled = true;
          selectedUids.delete(uid);
        }
      } catch (e) {
        console.error('Erro no lote:', e);
      }

      processed++;

      // Pausa humanizada anti-ban aleatória entre 8 e 13 segundos (ou 3s no teste rápido se for 1)
      if (processed < targetUids.length && !shouldStopBatch) {
        const delaySeconds = 8 + Math.floor(Math.random() * 5);
        for (let s = delaySeconds; s > 0; s--) {
          if (shouldStopBatch) break;
          if (queueBanner) {
            queueBanner.innerHTML = `
              <div class="ig-unf-queue-info">
                <span>🛡️ Segurança Anti-Bloqueio: Próximo perfil em <strong>${s}s</strong> (${processed} concluídos)...</span>
              </div>
              <button class="ig-unf-stop-btn" id="igStopBatchBtn">
                <span>${SVGS.stop}</span>
                <span>Cancelar</span>
              </button>
            `;
            queueBanner.querySelector('#igStopBatchBtn').addEventListener('click', () => {
              shouldStopBatch = true;
            });
          }
          await sleep(1000);
        }
      }
    }

    isBatchRunning = false;
    isBatchModeActive = false;
    updateBatchButtonState();
    if (queueBanner) {
      queueBanner.innerHTML = `
        <div class="ig-unf-queue-info">
          <span>${SVGS.check}</span>
          <span>Fila concluída: ${processed} perfis processados com sucesso.</span>
        </div>
      `;
      setTimeout(() => {
        queueBanner.style.display = 'none';
      }, 4000);
    }
  }

  // -------------------------------------------------------------
  // CRIAÇÃO DO CARD DE USUÁRIO COM VIP E SELEÇÃO
  // -------------------------------------------------------------
  function createUserCardElement(user, category) {
    const card = document.createElement('div');
    card.className = 'ig-unf-user-card';
    const uid = String(user.pk || user.id || user.pk_id);
    card.setAttribute('data-uid', uid);

    const isVip = vipWhitelist.has(uid);
    let actionBtnHtml = '';

    if (isVip) {
      actionBtnHtml = `<span class="ig-unf-vip-protected-badge">${SVGS.shield} <span>VIP Protegido</span></span>`;
    } else if (category === 'notFollowingBack') {
      actionBtnHtml = `<button class="ig-unf-unfollow-btn" data-action="unfollow">Deixar de Seguir</button>`;
    } else if (category === 'fans') {
      actionBtnHtml = `<button class="ig-unf-follow-btn" data-action="follow">Seguir de Volta</button>`;
    } else if (category === 'recentUnfollowers') {
      let blockBadge = '';
      if (user.blockStatus === 'blocked') {
        blockBadge = `<span class="ig-unf-status-pill blocked" title="Conta pública ativa, mas inacessível para você!">${SVGS.block} Te Bloqueou</span>`;
      } else if (user.blockStatus === 'deactivated') {
        blockBadge = `<span class="ig-unf-status-pill deactivated" title="Conta não encontrada nem publicamente">${SVGS.userX} Desativada</span>`;
      } else if (user.blockStatus === 'unfollow') {
        blockBadge = `<span class="ig-unf-status-pill unfollow" title="Conta aberta normal">${SVGS.userCheck} Unfollow</span>`;
      } else {
        blockBadge = `<button class="ig-unf-check-pill-btn" data-action="checkBlock" data-username="${user.username}" title="Testar se esta conta te bloqueou ou se foi unfollow">${SVGS.search} Bloqueou?</button>`;
      }

      actionBtnHtml = `
        <div class="ig-unf-recent-status-box" id="blockStatusBox-${uid}">
          ${blockBadge}
        </div>
        <button class="ig-unf-unfollow-btn" data-action="unfollow">Deixar de Seguir</button>
      `;
    } else {
      actionBtnHtml = `<span class="ig-unf-mutual-badge">Mútuo ✓</span>`;
    }

    const showCheckbox = category === 'notFollowingBack' && !isVip;

    card.innerHTML = `
      <div class="ig-unf-card-left">
        ${showCheckbox ? `<label class="ig-unf-checkbox-container" title="Selecionar para deseguir"><input type="checkbox" class="ig-unf-card-checkbox" data-uid="${uid}" ${selectedUids.has(uid) ? 'checked' : ''} aria-label="Selecionar para deseguir"></label>` : ''}
        <button class="ig-unf-star-btn ${isVip ? 'active' : ''}" data-uid="${uid}" title="${isVip ? 'Remover dos VIPs' : 'Adicionar à Lista VIP protegida'}">
          ${isVip ? SVGS.star : SVGS.starOutline}
        </button>
        <div class="ig-unf-user-info">
          <img class="ig-unf-avatar" src="${user.profile_pic_url || ''}" alt="${user.username}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';">
          <div class="ig-unf-names">
            <span class="ig-unf-username">
              @${user.username}
              ${user.is_verified ? `<span title="Verificado">${SVGS.verified}</span>` : ''}
            </span>
            <span class="ig-unf-fullname">${user.full_name || ''}</span>
          </div>
        </div>
      </div>
      <div class="ig-unf-actions-group">
        <a class="ig-unf-link-btn" href="https://www.instagram.com/${user.username}/" target="_blank" rel="noopener">
          <span>Ver Perfil</span>
          <span>${SVGS.externalLink}</span>
        </a>
        ${actionBtnHtml}
      </div>
    `;

    // Evento de Checkbox
    const cb = card.querySelector('.ig-unf-card-checkbox');
    if (cb) {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedUids.add(uid);
        } else {
          selectedUids.delete(uid);
          if (selectedUids.size === 0) {
            isBatchModeActive = false;
          }
        }
        updateBatchButtonState();
      });
    }

    // Evento de Estrela VIP
    const starBtn = card.querySelector('.ig-unf-star-btn');
    if (starBtn) {
      starBtn.addEventListener('click', async () => {
        const nowVip = await toggleVipUser(user);
        renderUserListFull();
      });
    }

    // Evento de Checagem Individual de Bloqueio
    const checkBlockBtn = card.querySelector('[data-action="checkBlock"]');
    if (checkBlockBtn) {
      checkBlockBtn.addEventListener('click', async () => {
        checkBlockBtn.disabled = true;
        checkBlockBtn.innerHTML = `<div class="ig-unf-spinner-sm"></div> <span>Checando...</span>`;
        const res = await checkUserBlockStatus(user.username);
        user.blockStatus = res.status;
        const box = card.querySelector(`#blockStatusBox-${uid}`);
        if (box) {
          if (res.status === 'blocked') {
            box.innerHTML = `<span class="ig-unf-status-pill blocked" title="Conta ativa na web, mas inacessível para você!">${SVGS.block} Te Bloqueou</span>`;
          } else if (res.status === 'deactivated') {
            box.innerHTML = `<span class="ig-unf-status-pill deactivated" title="Conta não encontrada">${SVGS.userX} Desativada</span>`;
          } else {
            box.innerHTML = `<span class="ig-unf-status-pill unfollow" title="Conta normal">${SVGS.userCheck} Unfollow</span>`;
          }
        }
      });
    }

    // Eventos de Ação
    const unfollowBtn = card.querySelector('[data-action="unfollow"]');
    if (unfollowBtn) {
      if (pendingUnfollows.has(uid)) {
        const pending = pendingUnfollows.get(uid);
        pending.btn = unfollowBtn;
        unfollowBtn.className = 'ig-unf-unfollow-btn ig-unf-btn-pending';
        const remainingSec = Math.max(1, Math.ceil((5000 - (Date.now() - pending.startTime)) / 1000));
        unfollowBtn.innerHTML = `<span>Cancelando... (<strong class="ig-btn-sec">${remainingSec}s</strong>)</span> <span class="ig-btn-undo-link">Desfazer</span>`;
        unfollowBtn.disabled = false;
      }
      unfollowBtn.addEventListener('click', () => handleUnfollow(uid, unfollowBtn, user.username));
    }

    const followBtn = card.querySelector('[data-action="follow"]');
    if (followBtn) {
      followBtn.addEventListener('click', () => handleFollow(uid, followBtn));
    }

    return card;
  }

  // -------------------------------------------------------------
  // FEEDBACK DE CARREGAMENTO DINÂMICO DA FASE 1 (SCANNING VIEW)
  // -------------------------------------------------------------
  function renderPhase1View() {
    const body = overlay?.querySelector('#igUnfBody');
    if (!body) return;

    if (body.querySelector('.ig-unf-phase1-wrapper')) return;

    body.innerHTML = `
      <div class="ig-unf-phase1-wrapper">
        <div class="ig-unf-phase1-top-bar">
          <div class="ig-unf-phase1-step-badge">
            <div class="ig-unf-pulse-dot"></div>
            <span id="igStreamingText">Passo 1/2: Mapeando seguidores...</span>
          </div>
          <button class="ig-unf-stop-btn" id="igStopScanBtn" type="button">
            <span>${SVGS.stop}</span>
            <span>Parar</span>
          </button>
        </div>

        <div class="ig-unf-phase1-card" role="region" aria-live="polite">
          <div class="ig-unf-phase1-radar">
            <div class="ig-unf-phase1-radar-ripple"></div>
            <div class="ig-unf-phase1-radar-icon">${SVGS.users}</div>
          </div>

          <div class="ig-unf-phase1-title">Mapeando quem te segue</div>
          <div class="ig-unf-phase1-desc">
            Para garantir precisão e nunca marcar um amigo ou conhecido na lista de unfollow por engano, mapeamos os seguidores primeiro.
          </div>

          <div class="ig-unf-progress-track">
            <div class="ig-unf-progress-bar" id="igPhase1ProgressBar" style="transform: scaleX(0.15);"></div>
          </div>

          <div class="ig-unf-phase1-stats">
            <span id="igPhase1Count"><strong>0</strong> seguidores mapeados</span>
            <span class="ig-unf-speed-tag">⚡ ~300 perfis/seg</span>
          </div>

          <div class="ig-unf-avatar-stream" id="igAvatarStream"></div>

          <div class="ig-unf-early-action" id="igEarlyActionArea" style="display: none;">
            <button class="ig-unf-early-btn" id="igEarlyReleaseBtn" type="button">
              <span>${SVGS.play}</span>
              <span id="igEarlyBtnText">Liberar lista agora com 100 seguidores</span>
            </button>
            <div class="ig-unf-early-hint">
              <span class="ig-unf-hint-icon">${SVGS.alert}</span>
              <span>Atenção: Liberar antecipadamente pode listar amigos como "não te seguem" se eles estiverem além dos que foram lidos.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const stopBtn = body.querySelector('#igStopScanBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        shouldStopScan = true;
        stopBtn.textContent = 'Parando...';
        stopBtn.disabled = true;
      });
    }
  }

  function ensurePhase1Container() {
    renderPhase1View();
  }

  function updatePhase1Progress(count, recentBatch, onEarlyReleaseClick) {
    renderPhase1View();

    const streamingText = overlay?.querySelector('#igStreamingText');
    if (streamingText) {
      streamingText.textContent = `Passo 1/2: Mapeando seguidores (${count} identificados)...`;
    }

    const countElem = overlay?.querySelector('#igPhase1Count');
    if (countElem) {
      countElem.innerHTML = `<strong>${count}</strong> seguidores mapeados`;
    }

    const progressBar = overlay?.querySelector('#igPhase1ProgressBar');
    if (progressBar) {
      const pct = Math.min(0.95, Math.max(0.15, (count / (count + 150))));
      progressBar.style.transform = `scaleX(${pct})`;
    }

    const stream = overlay?.querySelector('#igAvatarStream');
    if (stream && recentBatch && recentBatch.length > 0) {
      const sample = recentBatch.slice(0, 7);
      stream.innerHTML = sample.map(u => `
        <img class="ig-unf-stream-avatar" src="${u.profile_pic_url || ''}" alt="@${u.username}" title="@${u.username}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';">
      `).join('');
    }

    const earlyArea = overlay?.querySelector('#igEarlyActionArea');
    const earlyBtn = overlay?.querySelector('#igEarlyReleaseBtn');
    const earlyBtnText = overlay?.querySelector('#igEarlyBtnText');

    if (count >= 100 && earlyArea && earlyBtn) {
      earlyArea.style.display = 'flex';
      if (earlyBtnText) {
        earlyBtnText.textContent = `Liberar lista agora com ${count} seguidores`;
      }
      earlyBtn.onclick = onEarlyReleaseClick;
    }
  }

  // Renderização Incremental Suave
  function renderUserListIncremental() {
    const listElem = overlay?.querySelector('#igUserList');
    if (!listElem) return;

    if (isPhase1) {
      ensurePhase1Container();
      return;
    }

    if (searchTerm) {
      renderUserListFull();
      return;
    }

    const currentList = scanResults[currentTab] || [];
    if (currentList.length === 0) return;

    const emptyMsg = listElem.querySelector('.ig-unf-empty-msg, .ig-unf-scanning-state, #igPhase1Container');
    if (emptyMsg) {
      listElem.innerHTML = '';
    }

    const existingUids = new Set();
    listElem.querySelectorAll('[data-uid]').forEach(el => {
      existingUids.add(el.getAttribute('data-uid'));
    });

    const fragment = document.createDocumentFragment();
    currentList.forEach(user => {
      const uid = String(user.pk || user.id || user.pk_id);
      if (!existingUids.has(uid)) {
        fragment.appendChild(createUserCardElement(user, currentTab));
      }
    });

    if (fragment.children.length > 0) {
      listElem.appendChild(fragment);
    }
  }

  // Renderização Completa
  function renderUserListFull() {
    const listElem = overlay?.querySelector('#igUserList');
    if (!listElem) return;

    if (isPhase1) {
      ensurePhase1Container();
      return;
    }

    // Caso de Aba Recent Unfollowers no plano FREE (Teaser)
    if (currentTab === 'recentUnfollowers' && !isPro) {
      listElem.innerHTML = `
        <div class="ig-unf-pro-teaser-card">
          <div class="ig-unf-pro-teaser-icon">${SVGS.alert}</div>
          <div class="ig-unf-pro-teaser-title">${scanResults.recentUnfollowers.length} pessoas deixaram de te seguir</div>
          <div class="ig-unf-pro-teaser-desc">
            Identificamos quem deu unfollow na sua conta desde a última checagem. No plano PRO, você desbloqueia a lista com @, fotos e acesso direto.
          </div>
          <button class="ig-unf-pro-unlock-btn" id="igUnlockRecentBtn">
            ${SVGS.crown}
            <span>Desbloquear Histórico com PRO</span>
          </button>
        </div>
      `;
      listElem.querySelector('#igUnlockRecentBtn').addEventListener('click', openProModal);
      return;
    }

    // Filtra lista de acordo com a aba
    let list = [];
    if (currentTab === 'vip') {
      const allKnown = [...scanResults.notFollowingBack, ...scanResults.mutual, ...scanResults.fans];
      const seen = new Set();
      list = allKnown.filter(u => {
        const uid = String(u.pk || u.id || u.pk_id);
        if (vipWhitelist.has(uid) && !seen.has(uid)) {
          seen.add(uid);
          return true;
        }
        return false;
      });
    } else {
      list = scanResults[currentTab] || [];
    }

    const filtered = list.filter(u => {
      if (!searchTerm) return true;
      const uname = (u.username || '').toLowerCase();
      const fname = (u.full_name || '').toLowerCase();
      return uname.includes(searchTerm) || fname.includes(searchTerm);
    });

    listElem.innerHTML = '';

    if (filtered.length === 0) {
      listElem.innerHTML = `
        <div class="ig-unf-empty-msg">
          ${isScanning ? 'Analisando em tempo real... os primeiros perfis já vão surgir aqui.' : (searchTerm ? 'Nenhum usuário encontrado na pesquisa.' : (currentTab === 'vip' ? 'Nenhum usuário favoritado na Lista VIP ainda. Clique na estrela ⭐ de qualquer perfil para blindá-lo.' : 'Nenhum usuário nesta categoria.'))}
        </div>
      `;
      return;
    }

    // Ferramentas PRO de Bloqueio para a aba de Deixaram de Seguir
    if (currentTab === 'recentUnfollowers' && isPro && filtered.length > 0) {
      const topBar = document.createElement('div');
      topBar.className = 'ig-unf-recent-tools-bar';
      topBar.innerHTML = `
        <div class="ig-unf-recent-tools-text">
          <span>${SVGS.alert}</span>
          <span>Diferencie quem te deu <strong>unfollow</strong> de quem te <strong>bloqueou</strong>:</span>
        </div>
        <div class="ig-unf-recent-tools-actions">
          <button class="ig-unf-check-all-btn" id="igCheckAllRecentBlocksBtn">
            <span>${SVGS.search}</span>
            <span>Verificar Todos</span>
          </button>
          <button class="ig-unf-custom-check-btn" id="igOpenCustomBlockBtn">
            <span>${SVGS.block}</span>
            <span>Central de Bloqueios</span>
          </button>
        </div>
      `;
      listElem.appendChild(topBar);

      topBar.querySelector('#igOpenCustomBlockBtn').addEventListener('click', () => openBlockCheckerModal());
      const checkAllBtn = topBar.querySelector('#igCheckAllRecentBlocksBtn');
      checkAllBtn.addEventListener('click', async () => {
        checkAllBtn.disabled = true;
        checkAllBtn.innerHTML = `<div class="ig-unf-spinner-sm"></div> <span>Verificando...</span>`;

        for (const u of filtered) {
          if (!u.blockStatus) {
            const res = await checkUserBlockStatus(u.username);
            u.blockStatus = res.status;
            const uid = String(u.pk || u.id || u.pk_id);
            const box = listElem.querySelector(`#blockStatusBox-${uid}`);
            if (box) {
              if (res.status === 'blocked') {
                box.innerHTML = `<span class="ig-unf-status-pill blocked" title="Conta ativa na web pública, mas inacessível para você!">${SVGS.block} Te Bloqueou</span>`;
              } else if (res.status === 'deactivated') {
                box.innerHTML = `<span class="ig-unf-status-pill deactivated" title="Conta não encontrada">${SVGS.userX} Desativada</span>`;
              } else {
                box.innerHTML = `<span class="ig-unf-status-pill unfollow" title="Conta normal">${SVGS.userCheck} Unfollow</span>`;
              }
            }
            await sleep(350);
          }
        }
        checkAllBtn.innerHTML = `${SVGS.check} <span>Todos Checados ✓</span>`;
      });
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(user => {
      fragment.appendChild(createUserCardElement(user, currentTab));
    });

    listElem.appendChild(fragment);
  }

  // Exportação de Dados
  function exportData(format) {
    const list = scanResults[currentTab] || [];
    if (list.length === 0) {
      showToast('Nenhum usuário para exportar nesta lista.', 'warning', 4000);
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    let filename = `instagram_${currentTab}_${dateStamp}.${format}`;

    if (format === 'csv') {
      mimeType = 'text/csv;charset=utf-8;';
      content = 'Username,Full Name,Profile URL,Is VIP\n' + list.map(u => {
        const uid = String(u.pk || u.id || u.pk_id);
        const vipStatus = vipWhitelist.has(uid) ? 'SIM' : 'NAO';
        return `"${u.username}","${(u.full_name || '').replace(/"/g, '""')}","https://www.instagram.com/${u.username}/","${vipStatus}"`;
      }).join('\n');
    } else {
      content = list.map(u => {
        const uid = String(u.pk || u.id || u.pk_id);
        const vipText = vipWhitelist.has(uid) ? ' [VIP]' : '';
        return `@${u.username} (${u.full_name || ''})${vipText} - https://www.instagram.com/${u.username}/`;
      }).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  // Escuta mensagem vinda do popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'open_analyzer') {
      openModal();
      sendResponse({ status: 'ok' });
    }
  });

  // Sincronização e monitoramento automático da página nativa de contas bloqueadas
  function monitorBlockedAccountsPage() {
    if (!window.location.pathname.includes('/accounts/blocked_accounts')) return;
    function sync() {
      try {
        const users = scrapeBlockedAccountsFromDocument(document);
        if (users.length > 0 && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ ig_blocked_by_me_cache: users });
          try {
            const bc = new BroadcastChannel('ig_blocked_sync');
            bc.postMessage({ type: 'SYNC_BLOCKED', users: users });
            bc.close();
          } catch (e) {}
        }
      } catch (e) {}
    }
    setTimeout(sync, 400);
    setTimeout(sync, 1000);
    setTimeout(sync, 2000);
    setTimeout(sync, 4000);

    try {
      const observer = new MutationObserver(() => sync());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // ATALHOS DE TECLADO: ESC (FECHAR) E TAB (FOCUS TRAP EM MODAIS)
  // -------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // Identifica o container de modal atualmente ativo no topo
    function getActiveModalDialog() {
      const confirmOverlay = document.querySelector('.ig-unf-confirm-overlay');
      if (confirmOverlay) return confirmOverlay.querySelector('.ig-unf-confirm-dialog') || confirmOverlay;

      const blockModal = document.getElementById('igBlockCheckerModal');
      if (blockModal) return blockModal.querySelector('.ig-unf-block-dialog') || blockModal;

      const proModal = document.getElementById('igProModal');
      if (proModal) return proModal.querySelector('.ig-unf-pro-dialog') || proModal;

      if (overlay && overlay.style.display !== 'none') {
        return overlay.querySelector('.ig-unf-modal') || overlay;
      }
      return null;
    }

    if (e.key === 'Escape' || e.key === 'Esc') {
      // 1. Modal de confirmação de deseguir em lote
      const confirmOverlay = document.querySelector('.ig-unf-confirm-overlay');
      if (confirmOverlay) {
        confirmOverlay.remove();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Dropdown de exportação aberto
      if (activeExportMenuCleanup) {
        activeExportMenuCleanup();
        activeExportMenuCleanup = null;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 3. Central de Bloqueios
      const blockModal = document.getElementById('igBlockCheckerModal');
      if (blockModal) {
        blockModal.remove();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 4. Modal PRO
      const proModal = document.getElementById('igProModal');
      if (proModal) {
        proModal.remove();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 5. Modal Principal
      if (overlay && overlay.style.display !== 'none') {
        closeModal();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Enclausuramento de foco acessível (Focus Trap - WCAG 2.4.3)
    if (e.key === 'Tab') {
      const activeDialog = getActiveModalDialog();
      if (!activeDialog) return;

      const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(activeDialog.querySelectorAll(focusableSelector)).filter(el => {
        return el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      });

      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || !activeDialog.contains(document.activeElement)) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl || !activeDialog.contains(document.activeElement)) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }
  });

  monitorBlockedAccountsPage();
  window.addEventListener('popstate', monitorBlockedAccountsPage);

  // Injeção do botão na página do Instagram
  setTimeout(injectFloatingButton, 1000);
  setInterval(injectFloatingButton, 3000);
})();
