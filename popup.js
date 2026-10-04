document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnMainAction');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isInstagram = currentTab && currentTab.url && currentTab.url.includes('instagram.com');

    if (isInstagram) {
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Analisar Esta Aba</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.sendMessage(currentTab.id, { action: 'open_analyzer' }, () => {
          window.close();
        });
      });
    } else {
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        <span>Abrir Instagram</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.instagram.com' });
        window.close();
      });
    }
  });

  // Checagem e ativação do Plano PRO
  const proStatus = document.getElementById('popupProStatus');
  const proAction = document.getElementById('popupProActionArea');
  const keyInput = document.getElementById('popupKeyInput');
  const activateBtn = document.getElementById('popupActivateBtn');
  const proMsg = document.getElementById('popupProMsg');

  function refreshProUi() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ig_is_pro'], (res) => {
        if (res.ig_is_pro) {
          proStatus.textContent = 'PRO ATIVO';
          proStatus.style.background = 'rgba(245, 158, 11, 0.2)';
          proStatus.style.color = '#fbbf24';
          proStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          proAction.innerHTML = '<div style="font-size: 11px; color: #34d399; font-weight: 600;">✓ Todos os recursos PRO desbloqueados</div>';
        } else {
          proStatus.textContent = 'FREE';
          proStatus.style.background = '#27272a';
          proStatus.style.color = '#a1a1aa';
          proStatus.style.borderColor = '#3f3f46';
        }
      });
    }
  }

  refreshProUi();

  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      const key = (keyInput.value || '').trim().toUpperCase();
      if (key === 'PRO-VIP-2026' || key.startsWith('IGPRO-')) {
        chrome.storage.local.set({ ig_is_pro: true, ig_pro_license: key }, () => {
          proMsg.textContent = 'Ativado com sucesso!';
          proMsg.style.color = '#34d399';
          setTimeout(refreshProUi, 800);
        });
      } else {
        proMsg.textContent = 'Chave inválida. Use PRO-VIP-2026';
        proMsg.style.color = '#f87171';
      }
    });
  }
});
