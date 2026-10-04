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

  // Checagem e estado do Plano PRO
  const proStatus = document.getElementById('popupProStatus');
  const proAction = document.getElementById('popupProActionArea');
  const notifSection = document.getElementById('popupNotifSection');
  const notifToggle = document.getElementById('popupNotifToggle');
  const testNotifBtn = document.getElementById('popupTestNotifBtn');

  const PRO_CHECKOUT_URL = 'https://pay.kiwify.com.br/SEU_LINK';

  function refreshProUi() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ig_is_pro', 'ig_notifications_enabled'], (res) => {
        if (res.ig_is_pro) {
          proStatus.textContent = 'PRO ATIVO';
          proStatus.style.background = 'rgba(245, 158, 11, 0.2)';
          proStatus.style.color = '#fbbf24';
          proStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          proAction.innerHTML = '<div style="font-size: 12px; color: #34d399; font-weight: 600; text-align: center; padding: 6px 0;">✓ Plano PRO Vitalício Ativado</div>';
          if (notifSection) notifSection.style.display = 'block';
          if (notifToggle) notifToggle.checked = res.ig_notifications_enabled !== false;
        } else {
          proStatus.textContent = 'FREE';
          proStatus.style.background = '#27272a';
          proStatus.style.color = '#a1a1aa';
          proStatus.style.borderColor = '#3f3f46';
          proAction.innerHTML = `
            <a href="${PRO_CHECKOUT_URL}" target="_blank" rel="noopener noreferrer" id="popupBuyLink" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 800; min-height: 40px; box-sizing: border-box;">
              <span>⚡ Liberar PRO Vitalício por R$ 9,99 (PIX)</span>
            </a>
            <div style="font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 6px;">Pagamento único • Sem mensalidades</div>
          `;
          if (notifSection) notifSection.style.display = 'none';
        }
      });
    }
  }

  refreshProUi();

  if (notifToggle) {
    notifToggle.addEventListener('change', (e) => {
      chrome.storage.local.set({ ig_notifications_enabled: e.target.checked });
    });
  }

  if (testNotifBtn) {
    testNotifBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'test_notification' });
      testNotifBtn.textContent = 'Enviado! ✓';
      setTimeout(() => {
        testNotifBtn.textContent = 'Testar Notificação';
      }, 2000);
    });
  }
});
