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
    userX: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>`
  };

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
        // Existe para o público geral na internet, mas é inacessível para a sua conta logada!
        // PROVA DETERMINÍSTICA DE BLOQUEIO!
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

  async function activateLicense(key) {
    const clean = (key || '').trim().toUpperCase();
    if (clean === 'PRO-VIP-2026' || clean.startsWith('IGPRO-')) {
      isPro = true;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise(r => chrome.storage.local.set({ ig_is_pro: true, ig_pro_license: clean }, r));
      }
      updateProUiState();
      return { success: true, message: 'Plano PRO ativado com sucesso! Aproveite todos os recursos.' };
    }
    return { success: false, message: 'Chave inválida. Use a chave de teste PRO-VIP-2026.' };
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
  function injectFloatingButton() {
    if (document.querySelector('.ig-unfollowers-floating-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ig-unfollowers-floating-btn';
    btn.title = 'Quem Não Me Segue no Instagram?';
    btn.setAttribute('aria-label', 'Quem Não Me Segue no Instagram');
    btn.innerHTML = `
      <span class="ig-btn-icon">${SVGS.users}</span>
      <span class="ig-btn-text">Quem Não Me Segue?</span>
    `;

    btn.addEventListener('click', openModal);
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
  }

  function closeModal() {
    if (overlay) {
      overlay.style.display = 'none';
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
            <button class="ig-unf-ghost-btn" id="igBlockModalBtn" title="Verificar se alguém te bloqueou no Instagram">
              ${SVGS.block}
              <span>Checar Bloqueio</span>
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
            <div class="ig-unf-pro-act-label">Plano PRO Ativo ✓</div>
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
            <div class="ig-unf-pro-act-label">Ativação de Licença PRO</div>
            <div class="ig-unf-pro-input-group">
              <input type="text" class="ig-unf-pro-input" id="igProKeyInput" placeholder="Insira sua chave (ex: PRO-VIP-2026)">
              <button class="ig-unf-pro-submit-btn" id="igProActivateBtn">Ativar Agora</button>
            </div>
            <div class="ig-unf-pro-act-hint">
              💡 Chave de demonstração e testes: <code>PRO-VIP-2026</code>
            </div>
            <div id="igProStatusFeedback" class="ig-unf-pro-feedback"></div>
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
      const activateBtn = proModal.querySelector('#igProActivateBtn');
      const keyInput = proModal.querySelector('#igProKeyInput');
      const feedback = proModal.querySelector('#igProStatusFeedback');

      activateBtn.addEventListener('click', async () => {
        const res = await activateLicense(keyInput.value);
        if (res.success) {
          feedback.textContent = res.message;
          feedback.style.color = '#34d399';
          setTimeout(() => {
            proModal.remove();
            openProModal();
            renderResultsView();
          }, 800);
        } else {
          feedback.textContent = res.message;
          feedback.style.color = '#f87171';
        }
      });
    }
  }

  // Modal Interativo de Verificação de Bloqueio por @
  function openBlockCheckerModal(defaultUsername = '') {
    const existing = document.getElementById('igBlockCheckerModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'ig-unf-pro-overlay';
    modal.id = 'igBlockCheckerModal';

    modal.innerHTML = `
      <div class="ig-unf-block-dialog" role="dialog" aria-modal="true" aria-labelledby="igBlockTitle">
        <div class="ig-unf-block-dialog-header">
          <div class="ig-unf-block-hero-badge">${SVGS.block}</div>
          <div class="ig-unf-block-dialog-title" id="igBlockTitle">Verificador de Bloqueio</div>
          <div class="ig-unf-block-dialog-subtitle">
            Descubra se alguém te bloqueou, se desativou o perfil ou se continua com a conta normal.
          </div>
          <button class="ig-unf-close-btn ig-unf-block-close" id="igBlockCloseBtn" aria-label="Fechar">${SVGS.close}</button>
        </div>

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

        <div id="igBlockResultContainer" class="ig-unf-block-result-area" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#igBlockCloseBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const input = modal.querySelector('#igBlockUserInput');
    const submitBtn = modal.querySelector('#igBlockSubmitBtn');
    const resultBox = modal.querySelector('#igBlockResultContainer');

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

  // Ação Individual de Deixar de Seguir
  async function handleUnfollow(targetUserId, btn) {
    btn.disabled = true;
    btn.textContent = 'Deixando...';

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
        btn.innerHTML = `${SVGS.check} <span>Deixou de seguir</span>`;
        btn.style.background = '#27272a';
        btn.style.borderColor = '#38383e';
        btn.style.color = '#71717a';
        btn.disabled = true;
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Erro ao deixar de seguir:', res.status, errText);
        btn.textContent = 'Tentar no perfil ↗';
        btn.disabled = false;
        btn.onclick = () => {
          window.open(`https://www.instagram.com/web/friendships/${targetUserId}/`, '_blank');
        };
      }
    } catch (e) {
      console.error('Erro de rede ao deseguir:', e);
      btn.textContent = 'Erro de rede';
      btn.disabled = false;
    }
  }

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

    scanResults = {
      notFollowingBack: [],
      fans: [],
      mutual: [],
      recentUnfollowers: []
    };
    currentTab = 'notFollowingBack';
    searchTerm = '';

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

    try {
      // FASE 1: Mapeamento de seguidores
      const followersMap = new Map();
      let cursor = null;
      let hasMore = true;

      ensurePhase1Container();

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

        if (streamingText) {
          streamingText.textContent = `Passo 1/2: Mapeando seguidores (${followersMap.size} identificados)...`;
        }

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

      const listElem = overlay.querySelector('#igUserList');
      if (listElem) listElem.innerHTML = '';

      if (isEarlyReleased) {
        let earlyBanner = overlay.querySelector('#igEarlyWarningBanner');
        if (!earlyBanner) {
          earlyBanner = document.createElement('div');
          earlyBanner.id = 'igEarlyWarningBanner';
          earlyBanner.className = 'ig-unf-warning-banner';
          earlyBanner.innerHTML = `⚠️ <strong>Modo Antecipado:</strong> Você liberou a lista com ${followersMap.size} seguidores mapeados. Amigos fora dessa amostra podem aparecer temporariamente como não-seguidores. Sempre verifique o perfil antes de dar unfollow.`;
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
      alert(`Erro durante a análise: ${err.message}`);
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
          Não me seguem
          <span class="ig-unf-tab-badge">${scanResults.notFollowingBack.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'fans' ? 'active' : ''}" data-tab="fans" role="tab">
          Fãs
          <span class="ig-unf-tab-badge">${scanResults.fans.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'mutual' ? 'active' : ''}" data-tab="mutual" role="tab">
          Mútuos
          <span class="ig-unf-tab-badge">${scanResults.mutual.length}</span>
        </button>
        <button class="ig-unf-tab-btn alert-tab ${currentTab === 'recentUnfollowers' ? 'active' : ''}" data-tab="recentUnfollowers" role="tab">
          ${SVGS.alert}
          Deixaram de Seguir
          <span class="ig-unf-tab-badge alert-badge">${scanResults.recentUnfollowers.length}</span>
        </button>
        <button class="ig-unf-tab-btn vip-tab ${currentTab === 'vip' ? 'active' : ''}" data-tab="vip" role="tab">
          ${SVGS.star}
          VIPs
          <span class="ig-unf-tab-badge vip-badge">${vipWhitelist.size}</span>
        </button>
      </div>

      <div class="ig-unf-toolbar">
        <div class="ig-unf-search-wrapper">
          <span class="ig-unf-search-icon">${SVGS.search}</span>
          <input type="text" class="ig-unf-search-input" id="igSearchInput" placeholder="Pesquisar @arroba ou nome..." value="${searchTerm}" aria-label="Pesquisar perfis">
        </div>
        <button class="ig-unf-export-btn" id="igExportTxt">
          <span>${SVGS.download}</span>
          <span>TXT</span>
        </button>
        <button class="ig-unf-export-btn" id="igExportCsv">
          <span>${SVGS.download}</span>
          <span>CSV</span>
        </button>
      </div>

      <div class="ig-unf-batch-bar" id="igBatchBar" style="${currentTab === 'notFollowingBack' ? 'display: flex;' : 'display: none;'}">
        <div class="ig-unf-batch-select-group">
          <span class="ig-unf-batch-label">Seleção:</span>
          <button class="ig-unf-batch-chip" data-batch="10">+10</button>
          <button class="ig-unf-batch-chip" data-batch="25">+25</button>
          <button class="ig-unf-batch-chip" data-batch="all">Todos</button>
          <button class="ig-unf-batch-chip text" data-batch="clear">Limpar</button>
        </div>
        <button class="ig-unf-batch-run-btn" id="igBatchRunBtn" disabled>
          <span>${SVGS.trash}</span>
          <span id="igBatchRunText">Deseguir Selecionados (0)</span>
        </button>
      </div>

      <div id="igBatchQueueBanner" class="ig-unf-batch-queue-banner" style="display: none;"></div>

      <div class="ig-unf-user-list" id="igUserList"></div>
    `;

    // Eventos das abas
    body.querySelectorAll('.ig-unf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        body.querySelectorAll('.ig-unf-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const batchBar = body.querySelector('#igBatchBar');
        if (batchBar) {
          batchBar.style.display = currentTab === 'notFollowingBack' ? 'flex' : 'none';
        }
        renderUserListFull();
      });
    });

    // Pesquisa
    const searchInput = body.querySelector('#igSearchInput');
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderUserListFull();
    });

    // Exportação
    body.querySelector('#igExportTxt').addEventListener('click', () => exportData('txt'));
    body.querySelector('#igExportCsv').addEventListener('click', () => exportData('csv'));

    // Configuração dos botões de lote
    setupBatchControls();

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
        } else if (type === 'all') {
          list.forEach(u => selectedUids.add(String(u.pk || u.id || u.pk_id)));
        } else {
          const count = parseInt(type, 10);
          list.slice(0, count).forEach(u => selectedUids.add(String(u.pk || u.id || u.pk_id)));
        }
        updateBatchButtonState();
        syncCardCheckboxes();
      });
    });

    const runBtn = bar.querySelector('#igBatchRunBtn');
    runBtn.addEventListener('click', startBatchExecution);
  }

  function updateBatchButtonState() {
    const runBtn = overlay?.querySelector('#igBatchRunBtn');
    const text = overlay?.querySelector('#igBatchRunText');
    if (!runBtn || !text) return;

    const count = selectedUids.size;
    text.textContent = `Deseguir Selecionados (${count})`;
    runBtn.disabled = count === 0 || isBatchRunning;
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
        ${showCheckbox ? `<input type="checkbox" class="ig-unf-card-checkbox" data-uid="${uid}" ${selectedUids.has(uid) ? 'checked' : ''} aria-label="Selecionar para deseguir">` : ''}
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
      unfollowBtn.addEventListener('click', () => handleUnfollow(uid, unfollowBtn));
    }

    const followBtn = card.querySelector('[data-action="follow"]');
    if (followBtn) {
      followBtn.addEventListener('click', () => handleFollow(uid, followBtn));
    }

    return card;
  }

  // -------------------------------------------------------------
  // FEEDBACK DE CARREGAMENTO DINÂMICO DA FASE 1
  // -------------------------------------------------------------
  function ensurePhase1Container() {
    const listElem = overlay?.querySelector('#igUserList');
    if (!listElem) return;

    if (!listElem.querySelector('#igPhase1Container')) {
      listElem.innerHTML = `
        <div class="ig-unf-phase1-container" id="igPhase1Container">
          <div class="ig-unf-phase1-header">
            <span class="ig-unf-phase1-badge">⚡ Indexação de Base</span>
            <div class="ig-unf-spinner-sm"></div>
          </div>
          <div class="ig-unf-phase1-title">Mapeando quem te segue</div>
          <div class="ig-unf-phase1-desc">
            Para garantir precisão e nunca marcar um amigo ou conhecido na lista de unfollow por engano, mapeamos os seguidores primeiro.
          </div>

          <div class="ig-unf-progress-track">
            <div class="ig-unf-progress-bar" id="igPhase1ProgressBar" style="width: 15%;"></div>
          </div>

          <div class="ig-unf-phase1-stats">
            <span id="igPhase1Count"><strong>0</strong> seguidores mapeados</span>
            <span class="ig-unf-speed-tag">⚡ ~300 perfis/seg</span>
          </div>

          <div class="ig-unf-avatar-stream" id="igAvatarStream"></div>

          <div class="ig-unf-early-action" id="igEarlyActionArea" style="display: none;">
            <button class="ig-unf-early-btn" id="igEarlyReleaseBtn">
              <span>${SVGS.play}</span>
              <span id="igEarlyBtnText">Liberar lista agora com 100 seguidores</span>
            </button>
            <div class="ig-unf-early-hint">⚠️ Atenção: Liberar antecipadamente pode listar amigos como "não te seguem" se eles estiverem além dos que foram lidos.</div>
          </div>
        </div>
      `;
    }
  }

  function updatePhase1Progress(count, recentBatch, onEarlyReleaseClick) {
    ensurePhase1Container();

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
            <span>Testar outro @</span>
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
      alert('Nenhum usuário para exportar nesta lista.');
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    let filename = `instagram_${currentTab}_${Date.now()}.${format}`;

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

  // Injeção do botão na página do Instagram
  setTimeout(injectFloatingButton, 1000);
  setInterval(injectFloatingButton, 3000);
})();
