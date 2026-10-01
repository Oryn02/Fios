import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import {
  processVisionOrAudio,
  summarizeDocument,
  generateFlashcardsFromText,
  generateClozeAndQaFromTranscript,
  isPlatformKey,
} from '../geminiService.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').slice(0, 11) || null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v.slice(0, 11);
      const m = u.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* ignore */
  }
  const loose = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return loose?.[1] || null;
}

/** Best-effort YouTube caption scrape via timedtext / innertube. */
async function fetchYoutubeTranscript(videoId: string): Promise<string | null> {
  const langTries = ['en', 'en-US', 'en-GB', 'a.en'];
  for (const lang of langTries) {
    try {
      const tt = await fetch(
        `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${lang}&fmt=srv3`
      );
      if (tt.ok) {
        const xml = await tt.text();
        const texts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
          m[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
        );
        const joined = texts.join(' ').replace(/\s+/g, ' ').trim();
        if (joined.length > 40) return joined;
      }
    } catch {
      /* try next */
    }
  }

  // Light innertube player scrape for caption tracks
  try {
    const watch = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0 FiosBot/3.9' },
    });
    if (!watch.ok) return null;
    const html = await watch.text();
    const capMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
    if (!capMatch) return null;
    const tracks = JSON.parse(capMatch[1].replace(/\\u0026/g, '&')) as { baseUrl?: string; languageCode?: string }[];
    const track =
      tracks.find((t) => (t.languageCode || '').startsWith('en')) || tracks[0];
    if (!track?.baseUrl) return null;
    const capRes = await fetch(track.baseUrl);
    if (!capRes.ok) return null;
    const xml = await capRes.text();
    const texts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '')
    );
    const joined = texts.join(' ').replace(/\s+/g, ' ').trim();
    return joined.length > 40 ? joined : null;
  } catch {
    return null;
  }
}

async function youtubeOembedTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title || null;
  } catch {
    return null;
  }
}

/** POST /api/lecture/transcribe-chunk */
router.post('/transcribe-chunk', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const mediaBase64 = String(req.body?.mediaBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'audio/webm').trim();
    if (!mediaBase64) {
      res.status(400).json({ error: 'mediaBase64 is required' });
      return;
    }
    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = Math.ceil(mediaBase64.length / 4);
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }
    const notes = await processVisionOrAudio(mediaBase64, mimeType, apiKey);
    await recordUsage(req.userId!, estimateTokensFromText(notes.markdown || ''), billed);
    res.json({
      title: notes.title,
      transcript: notes.markdown,
      markdown: notes.markdown,
      codeBlocks: notes.codeBlocks || [],
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Transcribe chunk failed',
    });
  }
});

/** POST /api/lecture/finalize */
router.post('/finalize', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const transcript = String(req.body?.transcript || '').trim();
    if (!transcript) {
      res.status(400).json({ error: 'transcript is required' });
      return;
    }
    const title = String(req.body?.title || 'Live lecture').trim() || 'Live lecture';
    const moduleCode = String(req.body?.moduleCode || '').trim() || null;
    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(transcript);
    const quota = await assertWithinQuota(req.userId!, estimate * 2, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }

    const [summaryResult, deck] = await Promise.all([
      summarizeDocument(transcript, apiKey),
      generateFlashcardsFromText(transcript, apiKey),
    ]);
    await recordUsage(req.userId!, estimate * 2, billed);

    // Soft-persist lecture session when table exists
    try {
      const db = getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
      if (db) {
        await db.from('lecture_sessions').insert({
          user_id: req.userId,
          title,
          module_code: moduleCode,
          transcript,
          summary: summaryResult?.summary || null,
          meta: { cardCount: deck?.cards?.length || 0 },
        });
      }
    } catch {
      /* table may not exist yet */
    }

    res.json({
      summary: summaryResult,
      deck: {
        title: deck?.title || title,
        cards: deck?.cards || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Finalize lecture failed',
    });
  }
});

/** POST /api/lecture/ingest — YouTube URL or media → cloze + QA */
router.post('/ingest', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const url = String(req.body?.url || '').trim();
    const mediaBase64 = String(req.body?.mediaBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'audio/mpeg').trim();
    let title = String(req.body?.title || '').trim();
    const pastedTranscript = String(req.body?.transcript || '').trim();
    const apiKey = apiKeyOf(req);

    let transcript = pastedTranscript;

    if (!transcript && url && /youtu(\.be|be\.com)/i.test(url)) {
      const videoId = extractYoutubeId(url);
      if (!videoId) {
        res.status(400).json({
          error: 'Could not parse YouTube video id from URL. Paste the transcript instead.',
        });
        return;
      }
      const oembedTitle = await youtubeOembedTitle(url);
      if (oembedTitle && !title) title = oembedTitle;
      transcript = (await fetchYoutubeTranscript(videoId)) || '';
      if (!transcript) {
        res.status(400).json({
          error:
            'No captions available for this YouTube video. Paste a transcript in the transcript field, or upload MP3/MP4 audio/video instead. (yt-dlp is not available on this server.)',
          videoId,
          title: title || null,
          hint: 'Open the video → Show transcript → copy → paste into Fios.',
        });
        return;
      }
    } else if (!transcript && mediaBase64) {
      const notes = await processVisionOrAudio(mediaBase64, mimeType, apiKey);
      transcript = notes.markdown || '';
      if (!title) title = notes.title || 'Ingested media';
    }

    if (!transcript) {
      res.status(400).json({
        error: 'Provide url (YouTube), mediaBase64, or transcript text',
      });
      return;
    }

    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(transcript);
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }

    const result = await generateClozeAndQaFromTranscript(transcript, apiKey);
    await recordUsage(req.userId!, estimate, billed);

    res.json({
      title: title || result?.title || 'Ingested deck',
      transcript: transcript.slice(0, 50000),
      cards: result?.cards || [],
      source: url || (mediaBase64 ? 'media' : 'transcript'),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Ingest failed',
    });
  }
});

export default router;
