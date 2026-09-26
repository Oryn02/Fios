/**
 * Shared iCal / WebCal proxy helpers for ATU timetable feeds.
 * Keeps URL validation out of the route handler for reuse/tests.
 */

/** Hosts we always accept (ATU StudentSet + common calendar CDNs). */
const ALLOWED_HOST_SUFFIXES = [
  'timetables.atu.ie',
  'atu.ie',
  'office365.com',
  'outlook.office365.com',
  'outlook.live.com',
  'calendar.google.com',
  'www.google.com',
];

export function normalizeIcalUrl(raw: string): string {
  let url = String(raw || '').trim();
  if (!url) return '';
  // ATU / Outlook often hand out webcal:// links
  url = url.replace(/^webcal:\/\//i, 'https://');
  return url;
}

export interface IcalUrlCheck {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Validate and normalize a feed URL. Allows https only; prefers ATU hosts
 * but accepts other https calendar URLs with an ical-like path/query.
 */
export function validateIcalUrl(raw: string): IcalUrlCheck {
  const normalized = normalizeIcalUrl(raw);
  if (!normalized) {
    return { ok: false, error: 'Missing timetable URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: 'Invalid timetable URL. Paste a full https:// or webcal:// link.' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: 'Only https:// (or webcal://) timetable feeds are allowed.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const allowedHost = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );

  const looksLikeIcal =
    /ical|calendar|\.ics|studentset|studentSetID/i.test(parsed.pathname + parsed.search) ||
    host.includes('timetable');

  // ATU StudentSet pattern is first-class
  const isAtuStudentSet =
    host.endsWith('atu.ie') && /Ical\/StudentSet/i.test(parsed.pathname);

  if (!allowedHost && !looksLikeIcal) {
    return {
      ok: false,
      error:
        'URL host not recognized. Use an ATU link like https://timetables.atu.ie/Ical/StudentSet?studentSetID=…',
    };
  }

  if (isAtuStudentSet && !parsed.searchParams.get('studentSetID')) {
    return {
      ok: false,
      error: 'ATU StudentSet URL is missing studentSetID. Copy the full link from Timetables.',
    };
  }

  return { ok: true, url: parsed.toString() };
}
