/**
 * TTS for audio recaps. Prefers ElevenLabs when ELEVENLABS_API_KEY is set,
 * otherwise falls back to Google Cloud TTS REST (GOOGLE_TTS_API_KEY).
 */

export type TtsResult = {
  mimeType: string;
  buffer: Buffer;
  provider: 'elevenlabs' | 'google';
};

const MAX_CHARS = 4500;

function clipText(text: string): string {
  const t = String(text || '').trim();
  if (t.length <= MAX_CHARS) return t;
  return `${t.slice(0, MAX_CHARS - 1)}…`;
}

async function elevenLabsTts(text: string): Promise<TtsResult> {
  const apiKey = String(process.env.ELEVENLABS_API_KEY || '').trim();
  const voiceId = String(process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim();
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: clipText(text),
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return { mimeType: 'audio/mpeg', buffer: Buffer.from(ab), provider: 'elevenlabs' };
}

async function googleTts(text: string): Promise<TtsResult> {
  const apiKey = String(process.env.GOOGLE_TTS_API_KEY || '').trim();
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not set');

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: clipText(text) },
        voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google TTS failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) throw new Error('Google TTS returned empty audio');
  return {
    mimeType: 'audio/mpeg',
    buffer: Buffer.from(json.audioContent, 'base64'),
    provider: 'google',
  };
}

/**
 * Synthesize speech. ElevenLabs first, then Google TTS.
 */
export async function synthesizeSpeech(text: string): Promise<TtsResult> {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('No text to speak.');

  const maxSeconds = Number(process.env.AUDIO_RECAP_MAX_SECONDS) || 300;
  // Soft length guard (~150 wpm → chars)
  const approxSeconds = (cleaned.split(/\s+/).length / 150) * 60;
  if (approxSeconds > maxSeconds * 1.5) {
    throw new Error(`Recap text is too long for audio (cap ~${maxSeconds}s). Shorten the summary.`);
  }

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      return await elevenLabsTts(cleaned);
    } catch (err) {
      if (!process.env.GOOGLE_TTS_API_KEY) throw err;
      console.warn('ElevenLabs failed, falling back to Google TTS:', err);
    }
  }
  if (process.env.GOOGLE_TTS_API_KEY) {
    return await googleTts(cleaned);
  }
  throw new Error(
    'Audio recap is not configured. Set ELEVENLABS_API_KEY or GOOGLE_TTS_API_KEY on the server.'
  );
}
