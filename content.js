// Content Script para Extensão: Quem Não Me Segue no Instagram

(function () {
  'use strict';

  let overlay = null;
  let isScanning = false;
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

  // Abre ou exibe o modal
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

        <div class="ig-unf-body" id="igUnfBody">
          <!-- Renderizado dinamicamente -->
        </div>
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

  // Tela Inicial do Modal
  function renderInitialView() {
    const body = overlay.querySelector('#igUnfBody');
    const userId = getLoggedInUserId();

    if (!userId) {
      body.innerHTML = `
        <div class="ig-unf-start-card">
          <div class="ig-unf-big-icon">🔒</div>
          <div class="ig-unf-start-title">Você precisa estar logado</div>
          <p class="ig-unf-start-desc">
            Entre na sua conta do Instagram nesta aba para que a extensão possa ler sua lista com segurança e sem pedir senhas.
          </p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="ig-unf-start-card">
        <div class="ig-unf-big-icon">📊</div>
        <div class="ig-unf-start-title">Descubra quem não te segue de volta</div>
        <p class="ig-unf-start-desc">
          A análise é 100% segura e roda localmente. Usamos pausas automáticas para respeitar os limites do Instagram e proteger sua conta.
        </p>
        <button class="ig-unf-primary-btn" id="igStartScanBtn">
          🚀 Iniciar Análise Segura
        </button>
        <div id="igScanProgressContainer"></div>
      </div>
    `;

    body.querySelector('#igStartScanBtn').addEventListener('click', startScan);
  }

  // Faz busca paginada com pausas de segurança
  async function fetchFollowList(userId, type, onProgress) {
    let users = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const url = `/api/v1/friendships/${userId}/${type}/?count=50${cursor ? `&max_id=${cursor}` : ''}`;
      
      const res = await fetch(url, {
        headers: {
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Limite temporário atingido. Aguarde alguns minutos antes de tentar novamente.');
        }
        throw new Error(`Erro de conexão com o Instagram (${res.status})`);
      }

      const data = await res.json();
      const batch = data.users || [];
      users = users.concat(batch);

      onProgress(users.length);

      cursor = data.next_max_id;
      hasMore = !!cursor;

      if (hasMore) {
        // Pausa segura de 1.2 a 1.6 segundos entre cada lote de 50
        await sleep(1200 + Math.random() * 400);
      }
    }

    return users;
  }

  // Inicia o processo de escaneamento
  async function startScan() {
    const userId = getLoggedInUserId();
    if (!userId) return;

    isScanning = true;
    const body = overlay.querySelector('#igUnfBody');
    const startBtn = body.querySelector('#igStartScanBtn');
    if (startBtn) startBtn.style.display = 'none';

    const progContainer = body.querySelector('#igScanProgressContainer');
    progContainer.innerHTML = `
      <div class="ig-unf-progress-box">
        <div class="ig-unf-status-text" id="igStatusLabel">Buscando quem você segue...</div>
        <div class="ig-unf-progress-bar-bg">
          <div class="ig-unf-progress-bar-fill" id="igProgressFill" style="width: 15%;"></div>
        </div>
      </div>
    `;

    const statusLabel = progContainer.querySelector('#igStatusLabel');
    const progressFill = progContainer.querySelector('#igProgressFill');

    try {
      // 1. Buscar Following
      statusLabel.textContent = 'Buscando pessoas que você segue (0)...';
      const following = await fetchFollowList(userId, 'following', (count) => {
        statusLabel.textContent = `Buscando pessoas que você segue (${count})...`;
        progressFill.style.width = '35%';
      });

      // Pausa estratégica entre as duas listas
      statusLabel.textContent = 'Pausa de segurança antibloqueio...';
      progressFill.style.width = '50%';
      await sleep(2000);

      // 2. Buscar Followers
      statusLabel.textContent = 'Buscando seus seguidores (0)...';
      const followers = await fetchFollowList(userId, 'followers', (count) => {
        statusLabel.textContent = `Buscando seus seguidores (${count})...`;
        progressFill.style.width = '85%';
      });

      // 3. Comparação de listas
      statusLabel.textContent = 'Processando listas...';
      progressFill.style.width = '98%';
      await sleep(400);

      const followersMap = new Map();
      followers.forEach(u => followersMap.set(String(u.pk || u.id || u.pk_id), u));

      const followingMap = new Map();
      following.forEach(u => followingMap.set(String(u.pk || u.id || u.pk_id), u));

      // Quem você segue, mas não te segue de volta
      scanResults.notFollowingBack = following.filter(u => !followersMap.has(String(u.pk || u.id || u.pk_id)));

      // Fãs: quem te segue, mas você não segue
      scanResults.fans = followers.filter(u => !followingMap.has(String(u.pk || u.id || u.pk_id)));

      // Mútuos
      scanResults.mutual = following.filter(u => followersMap.has(String(u.pk || u.id || u.pk_id)));

      isScanning = false;
      renderResultsView();

    } catch (err) {
      isScanning = false;
      progContainer.innerHTML = `
        <div style="color: #ef4444; font-size: 13px; margin-top: 14px;">
          ❌ ${err.message}
        </div>
        <button class="ig-unf-export-btn" style="margin-top: 12px;" id="igRetryBtn">Tentar Novamente</button>
      `;
      progContainer.querySelector('#igRetryBtn')?.addEventListener('click', renderInitialView);
    }
  }

  // Renderiza a tela de resultados
  function renderResultsView() {
    const body = overlay.querySelector('#igUnfBody');

    body.innerHTML = `
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
          ${searchTerm ? 'Nenhum usuário encontrado na pesquisa.' : 'Nenhum usuário nesta categoria! 🎉'}
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
