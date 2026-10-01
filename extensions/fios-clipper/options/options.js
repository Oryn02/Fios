async function load() {
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

document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({
    fiosApiBase: document.getElementById('apiBase').value.trim(),
    fiosToken: document.getElementById('token').value.trim(),
    fiosGeminiKey: document.getElementById('gemini').value.trim(),
    fiosModuleCode: document.getElementById('moduleCode').value.trim(),
  });
  document.getElementById('status').textContent = 'Saved.';
});

load();
