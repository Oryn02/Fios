async function loadSettings() {
  const data = await chrome.storage.sync.get([
    'fiosApiBase',
    'fiosToken',
    'fiosGeminiKey',
    'fiosModuleCode',
  ]);
  document.getElementById('apiBase').value = data.fiosApiBase || '';
  document.getElementById('token').value = data.fiosToken || '';
  document.getElementById('gemini').value = data.fiosGeminiKey || '';
  document.getElementById('moduleCode').value = data.fiosModuleCode || '';
}

async function collectFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  const payload = await chrome.tabs.sendMessage(tab.id, { type: 'FIOS_COLLECT' });
  document.getElementById('title').value = payload?.title || tab.title || 'Web clip';
  document.getElementById('text').value = payload?.text || '';
  return { tab, payload };
}

document.getElementById('saveSettings').addEventListener('click', async () => {
  await chrome.storage.sync.set({
    fiosApiBase: document.getElementById('apiBase').value.trim(),
    fiosToken: document.getElementById('token').value.trim(),
    fiosGeminiKey: document.getElementById('gemini').value.trim(),
    fiosModuleCode: document.getElementById('moduleCode').value.trim(),
  });
  document.getElementById('status').textContent = 'Settings saved.';
});

document.getElementById('refresh').addEventListener('click', async () => {
  try {
    await collectFromTab();
    document.getElementById('status').textContent = 'Page text refreshed.';
  } catch (e) {
    document.getElementById('status').textContent = e.message || String(e);
  }
});

document.getElementById('clip').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Clipping…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await chrome.runtime.sendMessage({
      type: 'FIOS_CLIP',
      title: document.getElementById('title').value.trim(),
      text: document.getElementById('text').value.trim(),
      url: tab?.url,
      mode: document.getElementById('mode').value,
    });
    if (!res?.ok) throw new Error(res?.error || 'Clip failed');
    const deckTitle = res.data?.deck?.title || res.data?.title || 'OK';
    status.textContent = `Clipped: ${deckTitle}`;
  } catch (e) {
    status.textContent = e.message || String(e);
  }
});

loadSettings()
  .then(() => collectFromTab())
  .catch((e) => {
    document.getElementById('status').textContent =
      e.message || 'Open a page and reload the extension if needed.';
  });
