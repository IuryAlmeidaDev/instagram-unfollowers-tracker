// Content Script para Extensão: Quem Não Me Segue no Instagram (Impeccable Craft Edition)

(function () {
  'use strict';

  let overlay = null;
  let isScanning = false;
  let shouldStopScan = false;
  let isPhase1 = false;

  let scanResults = {
    notFollowingBack: [],
    fans: [],
    mutual: []
  };
  let currentTab = 'notFollowingBack';
  let searchTerm = '';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Ícones SVG consistentes (sem emojis improvisados)
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
    chart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`
  };

  // Obtém o ID do usuário logado via cookie ds_user_id
  function getLoggedInUserId() {
    const match = document.cookie.match(/ds_user_id=([0-9]+)/);
    return match ? match[1] : null;
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

  // Cria o botão flutuante proeminente no meio da lateral direita
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

  function openModal() {
    if (!overlay) {
      createModal();
    }
    overlay.style.display = 'flex';
  }

  function closeModal() {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Cria o modal visual
  function createModal() {
    overlay = document.createElement('div');
    overlay.className = 'ig-unf-overlay';

    overlay.innerHTML = `
      <div class="ig-unf-modal" role="dialog" aria-modal="true" aria-labelledby="igModalTitle">
        <div class="ig-unf-header">
          <div class="ig-unf-title-group">
            <div class="ig-unf-logo-badge">${SVGS.users}</div>
            <div class="ig-unf-title" id="igModalTitle">Detector de Não Seguidores</div>
          </div>
          <button class="ig-unf-close-btn" id="igUnfClose" aria-label="Fechar painel">${SVGS.close}</button>
        </div>

        <div class="ig-unf-body" id="igUnfBody"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#igUnfClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !isScanning) {
        closeModal();
      }
    });

    renderInitialView();
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
          <strong>Liberação suave em tempo real:</strong> os perfis entram gradualmente na tela sem travamentos, com botões para deixar de seguir ou retribuir com 1 clique.
        </p>
        <button class="ig-unf-primary-btn" id="igStartScanBtn">
          <span>${SVGS.play}</span>
          <span>Iniciar Análise ao Vivo</span>
        </button>
      </div>
    `;

    body.querySelector('#igStartScanBtn').addEventListener('click', startScan);
  }

  // Atualiza os contadores das abas
  function updateTabBadges() {
    const notBadge = overlay?.querySelector('[data-tab="notFollowingBack"] .ig-unf-tab-badge');
    const fansBadge = overlay?.querySelector('[data-tab="fans"] .ig-unf-tab-badge');
    const mutualBadge = overlay?.querySelector('[data-tab="mutual"] .ig-unf-tab-badge');

    if (notBadge) notBadge.textContent = scanResults.notFollowingBack.length;
    if (fansBadge) fansBadge.textContent = scanResults.fans.length;
    if (mutualBadge) mutualBadge.textContent = scanResults.mutual.length;
  }

  // Ação de Deixar de Seguir direto pelo card
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

  // Ação de Seguir de Volta (Fãs) direto pelo card
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

  // Scanner Progressivo
  async function startScan() {
    const userId = getLoggedInUserId();
    if (!userId) return;

    isScanning = true;
    shouldStopScan = false;
    isPhase1 = true;
    scanResults = { notFollowingBack: [], fans: [], mutual: [] };
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
      // -------------------------------------------------------------
      // FASE 1: Mapeia seguidores (em lotes rápidos de 100)
      // -------------------------------------------------------------
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

        if (streamingText) {
          streamingText.textContent = `Passo 1/2: Mapeando seguidores (${followersMap.size} identificados)...`;
        }
        const phase1Detail = overlay.querySelector('#igPhase1Detail');
        if (phase1Detail) {
          phase1Detail.textContent = `${followersMap.size} seguidores mapeados...`;
        }

        cursor = data.next_max_id;
        hasMore = !!cursor;

        if (hasMore && !shouldStopScan) {
          await sleep(550 + Math.random() * 200);
        }
      }

      if (shouldStopScan) {
        isScanning = false;
        isPhase1 = false;
        renderInitialView();
        return;
      }

      // -------------------------------------------------------------
      // FASE 2: Streaming e liberação suave dos cards!
      // -------------------------------------------------------------
      isPhase1 = false;
      let followingCursor = null;
      let hasMoreFollowing = true;
      let totalFollowingChecked = 0;

      const listElem = overlay.querySelector('#igUserList');
      if (listElem) listElem.innerHTML = '';

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
          await sleep(650 + Math.random() * 250);
        }
      }

      // -------------------------------------------------------------
      // FASE 3: Finalização
      // -------------------------------------------------------------
      scanResults.fans = Array.from(followersMap.values());
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

  // Renderiza a casca da tela de resultados
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
        <button class="ig-unf-tab-btn ${currentTab === 'notFollowingBack' ? 'active' : ''}" data-tab="notFollowingBack" role="tab" aria-selected="${currentTab === 'notFollowingBack'}">
          Não me seguem
          <span class="ig-unf-tab-badge">${scanResults.notFollowingBack.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'fans' ? 'active' : ''}" data-tab="fans" role="tab" aria-selected="${currentTab === 'fans'}">
          Fãs
          <span class="ig-unf-tab-badge">${scanResults.fans.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'mutual' ? 'active' : ''}" data-tab="mutual" role="tab" aria-selected="${currentTab === 'mutual'}">
          Mútuos
          <span class="ig-unf-tab-badge">${scanResults.mutual.length}</span>
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

      <div class="ig-unf-user-list" id="igUserList"></div>
    `;

    // Eventos das abas
    body.querySelectorAll('.ig-unf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        body.querySelectorAll('.ig-unf-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
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

    renderUserListFull();
  }

  // Cria o elemento HTML de um único card de usuário
  function createUserCardElement(user, category) {
    const card = document.createElement('div');
    card.className = 'ig-unf-user-card';
    card.setAttribute('data-uid', String(user.pk || user.id || user.pk_id));

    let actionBtnHtml = '';
    if (category === 'notFollowingBack') {
      actionBtnHtml = `<button class="ig-unf-unfollow-btn" data-action="unfollow">Deixar de Seguir</button>`;
    } else if (category === 'fans') {
      actionBtnHtml = `<button class="ig-unf-follow-btn" data-action="follow">Seguir de Volta</button>`;
    } else {
      actionBtnHtml = `<span class="ig-unf-mutual-badge">Mútuo ✓</span>`;
    }

    card.innerHTML = `
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
      <div class="ig-unf-actions-group">
        <a class="ig-unf-link-btn" href="https://www.instagram.com/${user.username}/" target="_blank" rel="noopener">
          <span>Ver Perfil</span>
          <span>${SVGS.externalLink}</span>
        </a>
        ${actionBtnHtml}
      </div>
    `;

    const unfollowBtn = card.querySelector('[data-action="unfollow"]');
    if (unfollowBtn) {
      unfollowBtn.addEventListener('click', () => handleUnfollow(user.pk || user.id || user.pk_id, unfollowBtn));
    }

    const followBtn = card.querySelector('[data-action="follow"]');
    if (followBtn) {
      followBtn.addEventListener('click', () => handleFollow(user.pk || user.id || user.pk_id, followBtn));
    }

    return card;
  }

  // Renderização Incremental Suave
  function renderUserListIncremental() {
    const listElem = overlay?.querySelector('#igUserList');
    if (!listElem) return;

    if (isPhase1) {
      listElem.innerHTML = `
        <div class="ig-unf-scanning-state">
          <div class="ig-unf-spinner"></div>
          <div style="font-weight: 600; font-size: 14px; margin-top: 14px; color: #ffffff;">Mapeando seguidores para liberar os resultados...</div>
          <div style="font-size: 12px; color: #a1a1aa; margin-top: 6px;" id="igPhase1Detail">Iniciando conexão rápida...</div>
        </div>
      `;
      return;
    }

    if (searchTerm) {
      renderUserListFull();
      return;
    }

    const currentList = scanResults[currentTab] || [];
    if (currentList.length === 0) {
      return;
    }

    const emptyMsg = listElem.querySelector('.ig-unf-empty-msg, .ig-unf-scanning-state');
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
      listElem.innerHTML = `
        <div class="ig-unf-scanning-state">
          <div class="ig-unf-spinner"></div>
          <div style="font-weight: 600; font-size: 14px; margin-top: 14px; color: #ffffff;">Mapeando seguidores para liberar os resultados...</div>
          <div style="font-size: 12px; color: #a1a1aa; margin-top: 6px;" id="igPhase1Detail">Iniciando conexão rápida...</div>
        </div>
      `;
      return;
    }

    const list = scanResults[currentTab] || [];
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
          ${isScanning ? 'Analisando em tempo real... os primeiros perfis já vão surgir aqui.' : (searchTerm ? 'Nenhum usuário encontrado na pesquisa.' : 'Nenhum usuário nesta categoria.')}
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(user => {
      fragment.appendChild(createUserCardElement(user, currentTab));
    });

    listElem.appendChild(fragment);
  }

  // Exportar dados
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
      content = 'Username,Full Name,Profile URL\n' + list.map(u => `"${u.username}","${(u.full_name || '').replace(/"/g, '""')}","https://www.instagram.com/${u.username}/"`).join('\n');
    } else {
      content = list.map(u => `@${u.username} (${u.full_name || ''}) - https://www.instagram.com/${u.username}/`).join('\n');
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

  // Injeção inicial na página
  setTimeout(injectFloatingButton, 1000);
  setInterval(injectFloatingButton, 3000);
})();
