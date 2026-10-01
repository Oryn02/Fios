/**
 * Content script — selection, readable body, YouTube transcript best-effort.
 */
function youtubeTranscriptBestEffort() {
  try {
    if (!/youtube\.com|youtu\.be/i.test(location.hostname)) return '';
    // Prefer open transcript panel segments if user opened them
    const segs = [
      ...document.querySelectorAll(
        'ytd-transcript-segment-renderer yt-formatted-string, .ytd-transcript-segment-renderer'
      ),
    ]
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean);
    if (segs.length) return segs.join(' ').slice(0, 40000);
    // Fallback: description
    const desc =
      document.querySelector('#description-inline-expander, #description, ytd-expander')?.textContent ||
      '';
    return desc.replace(/\s+/g, ' ').trim().slice(0, 20000);
  } catch {
    return '';
  }
}

function collectClipPayload() {
  const selection = String(window.getSelection?.()?.toString() || '').trim();
  let text = selection;
  if (!text) {
    const yt = youtubeTranscriptBestEffort();
    if (yt) text = yt;
  }
  if (!text) {
    const main =
      document.querySelector('main, article, [role="main"], .user_content, .mw-parser-output') ||
      document.body;
    text = (main?.innerText || '').replace(/\s+\n/g, '\n').trim().slice(0, 40000);
  }
  return {
    title: document.title || 'Web clip',
    text,
    url: location.href,
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FIOS_COLLECT') {
    sendResponse(collectClipPayload());
    return true;
  }
  return false;
});
