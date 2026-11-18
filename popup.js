const feedback = document.getElementById('popup-status');
const buttons = [...document.querySelectorAll('[data-view]')];
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

if (!tab) {
  feedback.textContent = '请先打开一个网页';
} else {
  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', async () => {
      for (const item of buttons) item.disabled = true;
      feedback.textContent = '';
      const view = button.dataset.view;
      const key = 'workspace:' + tab.windowId;
      const route = view === 'fill' ? { view, tabId: tab.id, request: crypto.randomUUID(), time: Date.now() } : { view };

      try {
        // Invoke the sidebar directly in the click handler while the gesture is active.
        const opening = chrome.sidePanel.open({ windowId: tab.windowId });
        await Promise.all([opening, chrome.storage.session.set({ [key]: route })]);
        window.close();
      } catch {
        feedback.textContent = '无法打开侧边栏，请重试';
        for (const item of buttons) item.disabled = false;
      }
    });
  }
}
