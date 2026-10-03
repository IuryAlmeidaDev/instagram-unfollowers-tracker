// Content Script para Extensão: Quem Não Me Segue no Instagram (Progressive Streaming)

(function () {
  'use strict';

  let overlay = null;
  let isScanning = false;
  let shouldStopScan = false;

  let scanResults = {
    notFollowingBack: [],
    fans: [],
    mutual: []
  };
  let currentTab = 'notFollowingBack';
  let searchTerm = '';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Obtém o ID do usuário logado via cookie ds_user_id
  function getLoggedInUserId() {
    const match = document.cookie.match(/ds_user_id=([0-9]+)/);
    return match ? match[1] : null;
  }

  // Cria o botão flutuante na página do Instagram
  function injectFloatingButton() {
    if (document.querySelector('.ig-unfollowers-floating-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'ig-unfollowers-floating-btn';
    btn.innerHTML = `
      <span>👥</span>
      <span>Quem Não Me Segue?</span>
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

  // Cria a estrutura visual do modal
  function createModal() {
    overlay = document.createElement('div');
    overlay.className = 'ig-unf-overlay';

    overlay.innerHTML = `
      <div class="ig-unf-modal">
        <div class="ig-unf-header">
          <div class="ig-unf-title-group">
            <div class="ig-unf-logo-badge">👥</div>
            <div class="ig-unf-title">Detector de Não Seguidores</div>
          </div>
          <button class="ig-unf-close-btn" id="igUnfClose">✕</button>
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
          <div class="ig-unf-big-icon">🔒</div>
          <div class="ig-unf-start-title">Você precisa estar logado</div>
          <p class="ig-unf-start-desc">
            Entre na sua conta do Instagram nesta aba para que a extensão possa analisar sua lista com segurança e sem pedir senhas.
          </p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="ig-unf-start-card">
        <div class="ig-unf-big-icon">⚡</div>
        <div class="ig-unf-start-title">Descubra quem não te segue de volta</div>
        <p class="ig-unf-start-desc">
          <strong>Liberação progressiva em tempo real:</strong> os perfis começam a aparecer na sua tela imediatamente enquanto a busca acontece.
        </p>
        <button class="ig-unf-primary-btn" id="igStartScanBtn">
          🚀 Iniciar Análise ao Vivo
        </button>
        <div id="igScanProgressContainer"></div>
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

  // Scanner Progressivo (libera os resultados em tempo real!)
  async function startScan() {
    const userId = getLoggedInUserId();
    if (!userId) return;

    isScanning = true;
    shouldStopScan = false;
    scanResults = { notFollowingBack: [], fans: [], mutual: [] };
    currentTab = 'notFollowingBack';
    searchTerm = '';

    const body = overlay.querySelector('#igUnfBody');
    const startBtn = body.querySelector('#igStartScanBtn');
    if (startBtn) startBtn.style.display = 'none';

    const progContainer = body.querySelector('#igScanProgressContainer');
    progContainer.innerHTML = `
      <div class="ig-unf-progress-box">
        <div class="ig-unf-status-text" id="igStatusLabel">Indexando seus seguidores...</div>
        <div class="ig-unf-progress-bar-bg">
          <div class="ig-unf-progress-bar-fill" id="igProgressFill" style="width: 25%;"></div>
        </div>
      </div>
    `;

    const statusLabel = progContainer.querySelector('#igStatusLabel');
    const progressFill = progContainer.querySelector('#igProgressFill');

    try {
      // -------------------------------------------------------------
      // FASE 1: Carrega seguidores (para saber quem te segue)
      // -------------------------------------------------------------
      const followersMap = new Map();
      let cursor = null;
      let hasMore = true;

      while (hasMore && !shouldStopScan) {
        const url = `/api/v1/friendships/${userId}/followers/?count=50${cursor ? `&max_id=${cursor}` : ''}`;
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

        statusLabel.textContent = `Indexando seus seguidores (${followersMap.size} identificados)...`;
        progressFill.style.width = '60%';

        cursor = data.next_max_id;
        hasMore = !!cursor;

        if (hasMore && !shouldStopScan) {
          await sleep(1100 + Math.random() * 300);
        }
      }

      if (shouldStopScan) {
        isScanning = false;
        renderInitialView();
        return;
      }

      // -------------------------------------------------------------
      // FASE 2: Transição imediata para a tela de resultados!
      // Os dados de quem você segue serão comparados e liberados AOS POUCOS
      // -------------------------------------------------------------
      renderResultsView(true); // Exibe os cards imediatamente!

      let followingCursor = null;
      let hasMoreFollowing = true;
      let totalFollowingChecked = 0;

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

      while (hasMoreFollowing && !shouldStopScan) {
        const url = `/api/v1/friendships/${userId}/following/?count=50${followingCursor ? `&max_id=${followingCursor}` : ''}`;
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

        // Compara cada usuário deste lote em tempo real!
        batch.forEach(u => {
          const key = String(u.pk || u.id || u.pk_id);
          if (!followersMap.has(key)) {
            // Não te segue de volta!
            scanResults.notFollowingBack.push(u);
          } else {
            // Mútuo
            scanResults.mutual.push(u);
            followersMap.delete(key); // o que sobrar no mapa no fim são os fãs!
          }
        });

        // Atualiza a tela IMEDIATAMENTE (Streaming progressivo)
        if (streamingText) {
          streamingText.textContent = `Analisando em tempo real: ${totalFollowingChecked} pessoas verificadas (${scanResults.notFollowingBack.length} não te seguem)...`;
        }
        updateTabBadges();
        renderUserList();

        followingCursor = data.next_max_id;
        hasMoreFollowing = !!followingCursor;

        if (hasMoreFollowing && !shouldStopScan) {
          await sleep(1200 + Math.random() * 400);
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
            <span>✅</span>
            <span><strong>Análise Finalizada:</strong> ${scanResults.notFollowingBack.length} pessoas não te seguem de volta.</span>
          </div>
        `;
        setTimeout(() => {
          streamingBanner.style.display = 'none';
        }, 5000);
      }

    } catch (err) {
      isScanning = false;
      alert(`Erro durante a análise: ${err.message}`);
      renderInitialView();
    }
  }

  // Renderiza a tela de resultados
  function renderResultsView(isStreaming = false) {
    const body = overlay.querySelector('#igUnfBody');

    body.innerHTML = `
      <div id="igStreamingBanner" class="ig-unf-streaming-banner" style="${isStreaming ? '' : 'display: none;'}">
        <div class="ig-unf-streaming-info">
          <div class="ig-unf-pulse-dot"></div>
          <span id="igStreamingText">Analisando e liberando perfis ao vivo...</span>
        </div>
        <button class="ig-unf-stop-btn" id="igStopScanBtn">⏹️ Parar</button>
      </div>

      <div class="ig-unf-tabs">
        <button class="ig-unf-tab-btn ${currentTab === 'notFollowingBack' ? 'active' : ''}" data-tab="notFollowingBack">
          Não me seguem
          <span class="ig-unf-tab-badge">${scanResults.notFollowingBack.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'fans' ? 'active' : ''}" data-tab="fans">
          Fãs
          <span class="ig-unf-tab-badge">${scanResults.fans.length}</span>
        </button>
        <button class="ig-unf-tab-btn ${currentTab === 'mutual' ? 'active' : ''}" data-tab="mutual">
          Mútuos
          <span class="ig-unf-tab-badge">${scanResults.mutual.length}</span>
        </button>
      </div>

      <div class="ig-unf-toolbar">
        <input type="text" class="ig-unf-search-input" id="igSearchInput" placeholder="Pesquisar @arroba ou nome..." value="${searchTerm}">
        <button class="ig-unf-export-btn" id="igExportTxt">📥 Exportar TXT</button>
        <button class="ig-unf-export-btn" id="igExportCsv">📊 Exportar CSV</button>
      </div>

      <div class="ig-unf-user-list" id="igUserList"></div>
    `;

    // Eventos das abas
    body.querySelectorAll('.ig-unf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        body.querySelectorAll('.ig-unf-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderUserList();
      });
    });

    // Pesquisa
    const searchInput = body.querySelector('#igSearchInput');
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderUserList();
    });

    // Exportação
    body.querySelector('#igExportTxt').addEventListener('click', () => exportData('txt'));
    body.querySelector('#igExportCsv').addEventListener('click', () => exportData('csv'));

    renderUserList();
  }

  // Renderiza a lista de usuários da aba ativa com filtro
  function renderUserList() {
    const listElem = overlay.querySelector('#igUserList');
    if (!listElem) return;

    const list = scanResults[currentTab] || [];
    const filtered = list.filter(u => {
      if (!searchTerm) return true;
      const uname = (u.username || '').toLowerCase();
      const fname = (u.full_name || '').toLowerCase();
      return uname.includes(searchTerm) || fname.includes(searchTerm);
    });

    if (filtered.length === 0) {
      listElem.innerHTML = `
        <div class="ig-unf-empty-msg">
          ${isScanning ? '⏳ Buscando e filtrando os primeiros perfis...' : (searchTerm ? 'Nenhum usuário encontrado na pesquisa.' : 'Nenhum usuário nesta categoria! 🎉')}
        </div>
      `;
      return;
    }

    listElem.innerHTML = filtered.map(user => `
      <div class="ig-unf-user-card">
        <div class="ig-unf-user-info">
          <img class="ig-unf-avatar" src="${user.profile_pic_url || ''}" alt="${user.username}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';">
          <div class="ig-unf-names">
            <span class="ig-unf-username">
              @${user.username}
              ${user.is_verified ? '<span title="Verificado" style="color: #0095f6;">✓</span>' : ''}
            </span>
            <span class="ig-unf-fullname">${user.full_name || ''}</span>
          </div>
        </div>
        <a class="ig-unf-link-btn" href="https://www.instagram.com/${user.username}/" target="_blank" rel="noopener">
          Ver Perfil ↗
        </a>
      </div>
    `).join('');
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
