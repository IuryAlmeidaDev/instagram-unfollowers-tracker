document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnMainAction');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isInstagram = currentTab && currentTab.url && currentTab.url.includes('instagram.com');

    if (isInstagram) {
      btn.innerHTML = '🔍 Analisar Esta Aba';
      btn.addEventListener('click', () => {
        chrome.tabs.sendMessage(currentTab.id, { action: 'open_analyzer' }, () => {
          window.close();
        });
      });
    } else {
      btn.innerHTML = '📷 Abrir Instagram';
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.instagram.com' });
        window.close();
      });
    }
  });
});
