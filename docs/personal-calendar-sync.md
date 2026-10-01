# Personal calendar sync (Google / Apple)

Fios Agenda is the live source of truth for classes + personal blocks.

## Already live (no OAuth)

- **iCal / webcal URL** (ATU Timetable and most university portals): paste into Agenda → Timetable.
- Background auto-sync every 5 minutes + on tab focus / reconnect so location and time changes land in Unified Agenda without re-entry.

## Google Calendar (two-way, optional)

1. Create a Google Cloud project → enable **Google Calendar API**.
2. Configure OAuth consent (external / test users) and create an **OAuth 2.0 Web client**.
3. Authorized redirect URI: `https://<your-api-host>/api/calendar/google/callback`
4. Set on the API service:

```bash
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://<your-api-host>/api/calendar/google/callback
```

5. Users connect from Settings → Integrations → Google Calendar (when the connect button is enabled).

Scopes requested: `calendar.events` (read/write personal blocks only — never marketing).

## Apple Calendar

- Prefer exporting / publishing an **iCal URL** from iCloud Calendar (Calendar → Share → Public Calendar) and pasting it into Agenda Timetable.
- Native Sign in with Apple calendar write-back is not required for Agenda truth; iCal publish covers free-window detection.

## Energy-aware free windows

Overview / Flight Plan free-window suggestions use the merged Agenda (lectures + personal blocks). Keep personal work/gym events on a synced feed so Fios does not schedule over them.
