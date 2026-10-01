# PWA widgets & home-screen shortcuts (Fios v4.0.0)

Chromium-based browsers (Chrome / Edge / Android) support a `shortcuts` array in `manifest.json`. Fios exposes:

| Shortcut | Opens |
|---|---|
| **Review due** | `/?tab=flashcards&review=1` — jumps to flashcards and starts the due-card review queue |
| **Streak** | `/?tab=overview&streak=1` — overview with streak / daily queue focus |

## iOS limits

Apple’s Web App / home-screen PWAs **do not** support:

- Manifest `shortcuts` (long-press app icon menus)
- Android-style glanceable widgets fed by the web app
- Background sync equivalent to Android WorkManager for widgets

On iOS you can still:

1. **Add to Home Screen** (Share → Add to Home Screen) for a fullscreen Fios icon.
2. Open the same deep links manually (`?tab=flashcards&review=1`) from Notes / Shortcuts.
3. Use the **iOS Shortcuts** app to open those URLs on a schedule (optional).

True home-screen widgets on iOS require a native (Swift) WidgetKit extension — out of scope for the web client.

## Quick routes

- `/?tab=flashcards&review=1` — due review
- `/?tab=overview` — dashboard / streak heatmap
- `/?tab=timer` — focus timer
- `/?tab=schedule` — timetable

See also `client/public/manifest.json` → `shortcuts`.
