# Fios IDE (VS Code)

Shows your Fios Daily Queue in the activity-bar sidebar so you can micro-review while builds run.

## Install (dev)

1. Open this folder in VS Code / Cursor.
2. Press F5 (**Run Extension**) or `code --install-extension` after packaging.
3. Command Palette → **Fios: Set API Base + Token**.
4. **Fios: Refresh Daily Queue**.

## Notes for Visual Studio

A full Visual Studio (Windows) extension is not bundled here. Use the VS Code extension in VS Code / Cursor, or open the web app PWA shortcuts (`/?tab=flashcards&review=1`) from a browser pinned to your taskbar while Visual Studio builds.

## API

Expects `GET /api/study/due-preview` (Bearer). Soft-fails with a hint if the route is unavailable — open the web app to review.
