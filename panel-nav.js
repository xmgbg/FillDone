import { fillPage } from './task.js';
import './learn.js';

const home = document.getElementById('home-view');
const fill = document.getElementById('fill-view');
const profile = document.getElementById('profile-view');
const back = document.getElementById('home-link');
const feedback = document.getElementById('status');
const { id: windowId } = await chrome.windows.getCurrent();
const key = 'workspace:' + windowId;
const ackKey = key + ':handled';
const saved = await chrome.storage.session.get([key, ackKey]);
let handledRequest = saved[ackKey];

function show(view) {
  home.hidden = view !== 'home';
  fill.hidden = view !== 'fill';
  profile.hidden = view !== 'profile';
  back.hidden = view === 'home';
  feedback.textContent = '';
  window.scrollTo(0, 0);
}

async function route(selection) {
  show(selection?.view === 'profile' ? 'profile' : 'fill');
  if (selection?.view !== 'fill' || !selection.request || handledRequest === selection.request) return;
  handledRequest = selection.request;
  await chrome.storage.session.set({ [ackKey]: handledRequest });
  if (!fill.hidden && handledRequest === selection.request) await fillPage(selection.tabId);
}

back.addEventListener('click', async () => {
  const showSidebarHome = () => {
    show('home');
    document.getElementById('show-fill').focus();
  };
  if (!chrome.action.openPopup || !chrome.sidePanel.close) {
    showSidebarHome();
    return;
  }

  back.disabled = true;
  try {
    await chrome.action.openPopup({ windowId });
  } catch {
    showSidebarHome();
    return;
  } finally {
    back.disabled = false;
  }

  // Once the popup is open, keep the sidebar home hidden even if closing fails.
  await chrome.sidePanel.close({ windowId }).catch(() => {});
});
document.getElementById('show-fill').onclick = () => { show('fill'); fillPage(); };
document.getElementById('show-profile').onclick = () => show('profile');

chrome.storage.session.onChanged.addListener(changes => {
  if (!changes[key]?.newValue) return;
  void route(changes[key].newValue);
});

// Restore the selected workspace on reload. A toolbar click is what requests autofill.
const selection = saved[key];
if (selection && Date.now() - selection.time < 5000) await route(selection);
else show(selection?.view === 'profile' ? 'profile' : 'fill');
