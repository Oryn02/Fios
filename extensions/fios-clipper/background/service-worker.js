/**
 * Fios Clipper — MV3 service worker.
 * Relays clip payloads from the popup to the configured Fios API.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['fiosApiBase', 'fiosToken'], (data) => {
    if (!data.fiosApiBase) {
      chrome.storage.sync.set({ fiosApiBase: 'https://fios-akjy.onrender.com' });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'FIOS_CLIP') return false;
  (async () => {
    try {
      const { fiosApiBase, fiosToken, fiosGeminiKey, fiosModuleCode } =
        await chrome.storage.sync.get([
          'fiosApiBase',
          'fiosToken',
          'fiosGeminiKey',
          'fiosModuleCode',
        ]);
      const base = String(fiosApiBase || 'https://fios-akjy.onrender.com').replace(/\/$/, '');
      const headers = { 'Content-Type': 'application/json' };
      if (fiosToken) headers.Authorization = `Bearer ${fiosToken}`;
      if (fiosGeminiKey) headers['x-gemini-key'] = fiosGeminiKey;
      const res = await fetch(`${base}/api/clipper/clip`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: msg.title,
          text: msg.text,
          url: msg.url,
          mode: msg.mode || 'deck',
          moduleCode: fiosModuleCode || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      sendResponse({ ok: true, data });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true;
});
