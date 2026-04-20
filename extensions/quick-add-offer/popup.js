/* global chrome */

const STORAGE_KEY = 'appBaseUrl';

function normalizeBase(url) {
  const s = String(url || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.origin + u.pathname.replace(/\/+$/, '') || u.origin;
  } catch {
    return '';
  }
}

function buildNewApplicationUrl(base, jobUrl) {
  const b = normalizeBase(base);
  if (!b || !jobUrl) return null;
  const path = b.endsWith('/') ? `${b}applications/new` : `${b}/applications/new`;
  const q = new URLSearchParams({ jobUrl });
  return `${path}?${q.toString()}`;
}

async function getActiveTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  return tab?.url || '';
}

function init() {
  const baseInput = document.getElementById('base');
  const saveBtn = document.getElementById('saveBase');
  const openBtn = document.getElementById('openApp');
  const tabUrlEl = document.getElementById('tabUrl');
  const hint = document.getElementById('hint');

  chrome.storage.sync.get([STORAGE_KEY], (stored) => {
    if (stored[STORAGE_KEY]) {
      baseInput.value = stored[STORAGE_KEY];
    }
    refreshState();
  });

  function refreshState() {
    void getActiveTabUrl().then((tabUrl) => {
      const base = normalizeBase(baseInput.value);
      const isHttp = tabUrl.startsWith('http://') || tabUrl.startsWith('https://');
      if (!isHttp) {
        tabUrlEl.hidden = false;
        tabUrlEl.textContent =
          'Cet onglet n’a pas d’URL web (page interne du navigateur). Ouvrez d’abord la page de l’offre.';
        tabUrlEl.classList.remove('ok');
        openBtn.disabled = true;
        return;
      }
      tabUrlEl.hidden = false;
      tabUrlEl.classList.add('ok');
      tabUrlEl.textContent = `Onglet actuel : ${tabUrl.length > 80 ? tabUrl.slice(0, 80) + '…' : tabUrl}`;
      openBtn.disabled = !base;
    });
  }

  baseInput.addEventListener('input', refreshState);

  saveBtn.addEventListener('click', () => {
    const base = normalizeBase(baseInput.value);
    if (!base) {
      hint.textContent = 'Indiquez une URL valide (https://…).';
      return;
    }
    chrome.storage.sync.set({ [STORAGE_KEY]: baseInput.value.trim().replace(/\/+$/, '') }, () => {
      hint.textContent = 'URL enregistrée sur cet appareil.';
      refreshState();
    });
  });

  openBtn.addEventListener('click', async () => {
    const base = baseInput.value.trim();
    const tabUrl = await getActiveTabUrl();
    const target = buildNewApplicationUrl(base, tabUrl);
    if (!target) {
      hint.textContent = 'Vérifiez l’URL de l’app et que l’onglet est une page http(s).';
      return;
    }
    await chrome.tabs.create({ url: target });
    window.close();
  });

  refreshState();
}

document.addEventListener('DOMContentLoaded', init);
