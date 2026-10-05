document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnMainAction');
  if (!btn) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs && tabs[0];
    const isInstagram = Boolean(currentTab && currentTab.url && currentTab.url.includes('instagram.com'));

    if (isInstagram) {
      btn.innerHTML = `
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Analisar Esta Aba</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.sendMessage(currentTab.id, { action: 'open_analyzer' }, () => {
          window.close();
        });
      });
    } else {
      btn.innerHTML = `
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        <span>Abrir Instagram</span>
      `;
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.instagram.com' });
        window.close();
      });
    }
  });
});
