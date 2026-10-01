import { Router, Response } from 'express';
import multer from 'multer';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';
import { parseSyllabusEvents, isPlatformKey } from '../geminiService.js';
import { extractPdfTextFromBuffer } from '../pdfText.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

type SyllabusEvent = {
  title: string;
  type: string;
  date?: string;
  time?: string;
  description?: string;
  moduleCode?: string;
};

/** Build a downloadable iCalendar document from extracted events. */
export function eventsToIcs(events: SyllabusEvent[], calendarName = 'Fios Syllabus'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fios//Syllabus Parser//EN',
    `X-WR-CALNAME:${calendarName.replace(/[,;\\]/g, ' ')}`,
  ];
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.date || !/^\d{4}-\d{2}-\d{2}/.test(e.date)) continue;
    const day = e.date.slice(0, 10).replace(/-/g, '');
    const uid = `fios-syllabus-${day}-${i}@fios.app`;
    const summary = (e.title || 'Event').replace(/[,;\\]/g, ' ').slice(0, 120);
    const desc = (e.description || e.type || '').replace(/[,;\\]/g, ' ').slice(0, 400);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (e.time && /^\d{1,2}:\d{2}/.test(e.time)) {
      const [hh, mm] = e.time.split(':');
      const t = `${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
      lines.push(`DTSTART:${day}T${t}`);
      lines.push(`DTEND:${day}T${t}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day}`);
    }
    lines.push(`SUMMARY:${summary}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * POST /api/syllabus/parse
 * Body: multipart file and/or { text, moduleCode?, insertHints? }
 */
router.post('/parse', requireUser, upload.single('file'), async (req: AuthedRequest, res: Response) => {
  try {
    let text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text && req.file?.buffer?.length) {
      const isPdf =
        req.file.buffer.subarray(0, 5).toString('ascii') === '%PDF-' ||
        /\.pdf$/i.test(req.file.originalname || '');
      if (isPdf) {
        text = await extractPdfTextFromBuffer(req.file.buffer);
      } else {
        text = req.file.buffer.toString('utf8');
      }
    }
    if (!text.trim()) {
      res.status(400).json({ error: 'Provide text or upload a syllabus file' });
      return;
    }

    const moduleCode = String(req.body?.moduleCode || '').trim() || undefined;
    const insertHints =
      req.body?.insertHints === true ||
      req.body?.insertHints === 'true' ||
      req.body?.insertHints === '1';

    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(text.slice(0, 12000));
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }

    const parsed = await parseSyllabusEvents({ text, moduleCode, apiKey });
    await recordUsage(req.userId!, estimate, billed);

    const events: SyllabusEvent[] = Array.isArray(parsed?.events)
      ? parsed.events.map((e: any) => ({
          title: String(e.title || 'Event'),
          type: String(e.type || 'other'),
          date: e.date ? String(e.date).slice(0, 10) : undefined,
          time: e.time ? String(e.time) : undefined,
          description: e.description ? String(e.description) : undefined,
          moduleCode: e.moduleCode ? String(e.moduleCode) : moduleCode,
        }))
      : [];

    const ics = eventsToIcs(events, moduleCode ? `${moduleCode} Syllabus` : 'Fios Syllabus');

    const db = dbFor(req);
    const savedIds: string[] = [];
    if (db && events.length) {
      try {
        for (const e of events) {
          const { data } = await db
            .from('syllabus_events')
            .insert({
              user_id: req.userId,
              module_code: e.moduleCode || moduleCode || null,
              title: e.title,
              event_type: e.type,
              event_date: e.date || null,
              event_time: e.time || null,
              description: e.description || null,
              source_excerpt: text.slice(0, 500),
            })
            .select('id')
            .maybeSingle();
          if (data?.id) savedIds.push(data.id);
        }
      } catch {
        /* optional table */
      }
    }

    res.json({
      events,
      notes: parsed?.notes || '',
      ics,
      savedIds,
      calendarHints: insertHints
        ? events
            .filter((e) => e.date)
            .map((e) => ({
              title: e.title,
              date: e.date,
              time: e.time,
              moduleCode: e.moduleCode || moduleCode,
              type: e.type,
            }))
        : [],
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Syllabus parse failed',
    });
  }
});

export default router;
