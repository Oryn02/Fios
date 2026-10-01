# Fios Web Clipper (Chrome / Edge / Firefox MV3)

Clip highlighted text or the main page body from Canvas, Moodle, Wikipedia, YouTube descriptions, or any site into Fios.

## Install (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this `extensions/fios-clipper` folder.
4. Click the puzzle icon → pin **Fios Web Clipper**.

## Options page

Right-click the extension icon → Options, or open from chrome://extensions.

## Configure

Open the popup → **API settings**:

| Field | Value |
| --- | --- |
| API base | Your Render Web Service origin, e.g. `https://fios-akjy.onrender.com` (no trailing slash) |
| Supabase access token | From a signed-in Fios session (`supabase.auth.getSession()` → `access_token`) |
| Gemini key | Optional BYO key (else server key / metered) |
| Module code | Optional default module for clipped decks |

## Use

1. Select text on a page (or leave empty to clip the main article body).
2. Open the popup → choose **Flashcard deck** or **Audio recap**.
3. Click **Clip**.

The extension POSTs to `POST /api/clipper/clip` with Bearer auth.

## Icons

Placeholder PNGs live in `icons/`. Replace with branded assets before store submission.

## Firefox

Load as a temporary add-on from `about:debugging` → This Firefox → Load Temporary Add-on → pick `manifest.json`. Host permissions may need the exact Fios API origin.
