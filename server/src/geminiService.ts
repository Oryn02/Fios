import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  flashcardSchema,
  quizSchema,
  codeExamSchema,
  codeGradeSchema,
  summarySchema,
  recallSchema,
  mediaNotesSchema,
  oralExamSchema,
  occlusionMaskSchema,
  mindMapSchema,
  mnemonicSchema,
  socraticSchema,
  clozeCardSchema,
  groundedChatSchema,
  vivaCoachSchema,
  feynmanSchema,
  elaborateSchema,
  dualCodeSchema,
  voiceGradeSchema,
  mockExamSchema,
  mockExamGradeSchema,
  syllabusParseSchema,
} from './schemas.js';

dotenv.config();

const serverApiKey = process.env.GEMINI_API_KEY;

/** Primary Gemini Flash model (override with GEMINI_FLASH_MODEL). */
export const GEMINI_FLASH_MODEL =
  String(process.env.GEMINI_FLASH_MODEL || '').trim() || 'gemini-3.8-flash';

/** Gemini Pro fallback for harder tasks (override with GEMINI_PRO_MODEL). */
export const GEMINI_PRO_MODEL =
  String(process.env.GEMINI_PRO_MODEL || '').trim() || 'gemini-3.1-pro';

/** @deprecated Prefer GEMINI_FLASH_MODEL — kept for internal callers. */
const MODEL_NAME = GEMINI_FLASH_MODEL;

/**
 * Resolve a Gemini client. Prefers a per-request (BYO) key supplied by the
 * user, then falls back to the server's configured key. Throws a clear error
 * if neither is available so the client can prompt the user for a key.
 */
function getClient(userApiKey?: string): GoogleGenAI {
  const apiKey = (userApiKey && userApiKey.trim()) || serverApiKey;
  if (!apiKey) {
    throw new Error('No Gemini API key available. Add your key in Settings (Bring Your Own Key).');
  }
  return new GoogleGenAI({ apiKey });
}

/** True when the request will bill against the server GEMINI_API_KEY. */
export function isPlatformKey(userApiKey?: string): boolean {
  const byo = (userApiKey && userApiKey.trim()) || '';
  return !byo && Boolean(serverApiKey);
}

function cleanJsonResponse(rawText: string): string {
  return rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function extractText(response: unknown): string {
  const r = response as { text?: unknown; candidates?: unknown };
  if (typeof r?.text === 'string') return r.text;
  if (Array.isArray(r?.candidates)) {
    return (r.candidates as any[])
      .flatMap((c) => c?.content?.parts || [])
      .map((p) => p?.text || '')
      .join('');
  }
  return '';
}

/**
 * Generate with Flash, falling back to Pro on model/rate failures.
 */
export async function generateWithFallback(
  opts: {
    contents: string | unknown;
    config?: Record<string, unknown>;
    apiKey?: string;
    preferPro?: boolean;
  }
): Promise<{ text: string; model: string }> {
  const ai = getClient(opts.apiKey);
  const primary = opts.preferPro ? GEMINI_PRO_MODEL : GEMINI_FLASH_MODEL;
  const secondary = opts.preferPro ? GEMINI_FLASH_MODEL : GEMINI_PRO_MODEL;
  const models = [primary, secondary];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: opts.contents as any,
        config: opts.config as any,
      });
      const text = extractText(response);
      if (!text.trim()) throw new Error('No text returned from Gemini model.');
      return { text, model };
    } catch (err) {
      lastErr = err;
      console.warn(`Gemini model ${model} failed, trying fallback…`, err);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'Gemini request failed'));
}

/** Count whitespace-separated words in a string. */
function wordCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Generate spaced-repetition flashcards from study notes.
 * @param studyNotes - Raw lecture / note text
 * @param apiKey - Optional BYO Gemini API key
 */
export async function generateFlashcardsFromText(studyNotes: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const hasPageMarkers = /---\s*Page\s+\d+\s*---/i.test(studyNotes || '');
  const citationHint = hasPageMarkers
    ? ' When notes contain `--- Page N ---` markers, set sourcePage to that page number, sourceParagraph to the 1-based paragraph within the page when possible, and sourceQuote to a short verbatim excerpt grounding the card. Omit citation fields only when truly unknown.'
    : ' If page markers are absent, leave sourcePage/sourceParagraph/sourceQuote unset or empty.';
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: flashcardSchema,
      systemInstruction: `You are an expert study assistant. Create high-quality, concise study flashcards covering key concepts.${citationHint}`,
    },
  });

  const raw =
    typeof response.text === 'string'
      ? response.text
      : Array.isArray((response as any)?.candidates)
        ? (response as any).candidates
            .flatMap((c: any) => c?.content?.parts || [])
            .map((p: any) => p?.text || '')
            .join('')
        : '';
  if (!raw.trim()) throw new Error('No text returned from Gemini model.');
  const parsed = JSON.parse(cleanJsonResponse(raw));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Gemini returned an invalid flashcard payload.');
  }
  return parsed;
}

/**
 * Generate a multiple-choice quiz from study notes.
 * @param studyNotes - Raw lecture / note text
 * @param apiKey - Optional BYO Gemini API key
 */
/**
 * Generate an MCQ quiz from lecture notes.
 * @param studyNotes - Source material
 * @param apiKey - Optional BYO Gemini key
 * @param questionCount - Number of questions (default 5, max 40)
 */
export async function generateQuizFromText(
  studyNotes: string,
  apiKey?: string,
  questionCount: number = 5
) {
  const count = Math.min(40, Math.max(1, Math.floor(Number(questionCount) || 5)));
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a ${count}-question multiple-choice quiz based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: `You are an expert tutor. Create exactly ${count} clear multiple choice questions with 4 distinct options each.`,
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
};

const EXAM_TYPE_INSTRUCTIONS: Record<string, string> = {
  bug_fix: 'Write a short program that contains a single, realistic bug. The student must find and fix it. starterCode must contain the buggy version; solutionCode must contain the corrected version.',
  output_prediction: 'Write a short, self-contained program. The student must predict its exact console output. starterCode must contain the program to trace; expectedOutput must contain the exact output; solutionCode may repeat the program.',
  logic_completion: 'Write a function with a clearly described goal but missing core logic (use a TODO comment). The student must complete it. starterCode must contain the incomplete function; solutionCode must contain the complete function.',
};

/**
 * Generate a coding challenge (bug-fix, output-prediction, or logic-completion).
 * @param language - Target language id (javascript, typescript, python, c)
 * @param examType - Challenge type key
 * @param topic - Optional topic focus
 * @param difficulty - beginner | intermediate | advanced
 * @param apiKey - Optional BYO Gemini API key
 * @param customPrompt - Optional extra instructions appended to the generation prompt
 */
export async function generateCodeExam(
  language: string,
  examType: string,
  topic: string,
  difficulty: string = 'intermediate',
  apiKey?: string,
  customPrompt?: string
) {
  const ai = getClient(apiKey);
  const langLabel = LANGUAGE_LABELS[language] || 'JavaScript';
  const typeInstruction = EXAM_TYPE_INSTRUCTIONS[examType] || EXAM_TYPE_INSTRUCTIONS.bug_fix;
  const topicClause = topic?.trim()
    ? `Focus the challenge on this topic: "${topic.trim()}".`
    : 'Pick a common, practical topic for the language.';
  const customClause = customPrompt?.trim()
    ? `\n\nAdditional instructor instructions:\n${customPrompt.trim()}`
    : '';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create a ${difficulty} ${langLabel} coding challenge of type "${examType}". ${typeInstruction} ${topicClause}${customClause}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: codeExamSchema,
      systemInstruction:
        'You are an expert programming instructor. Produce concise, self-contained coding challenges. Return well-formatted, runnable code in the requested language only.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Grade a student code submission against a reference solution.
 */
export async function gradeCodeSubmission(
  language: string,
  prompt: string,
  solutionCode: string,
  userCode: string,
  apiKey?: string
) {
  const ai = getClient(apiKey);
  const langLabel = LANGUAGE_LABELS[language] || 'JavaScript';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Grade this ${langLabel} submission.\n\nChallenge:\n${prompt}\n\nReference solution:\n\`\`\`\n${solutionCode}\n\`\`\`\n\nStudent submission:\n\`\`\`\n${userCode}\n\`\`\`\n\nEvaluate correctness against the challenge goal (not exact string match). Award partial credit for close attempts.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: codeGradeSchema,
      systemInstruction:
        'You are a fair, encouraging code reviewer. Judge whether the student solution satisfies the challenge and provide actionable feedback.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Summarize a document and extract a glossary of key terms.
 * For long documents prefer {@link summarizeWithChunks}.
 */
export async function summarizeDocument(text: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Summarize the following study material and extract the key glossary terms.\n\n${text}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: summarySchema,
      systemInstruction:
        'You are an expert study assistant. Produce a concise, well-structured summary and a glossary of the most important terms with clear definitions.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Summarize long documents by chunking first, summarizing each chunk, then
 * synthesizing a final summary + glossary. Falls back to {@link summarizeDocument}
 * when the text is short enough to fit in one pass (~targetWords).
 *
 * @param text - Full document text
 * @param apiKey - Optional BYO Gemini API key
 * @param targetWords - Chunk size for {@link chunkText} (default 500)
 */
export async function summarizeWithChunks(
  text: string,
  apiKey?: string,
  targetWords: number = 500
) {
  const chunks = chunkText(text, targetWords);
  if (chunks.length <= 1) {
    return summarizeDocument(text, apiKey);
  }

  const ai = getClient(apiKey);
  const partialSummaries: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Summarize section ${i + 1} of ${chunks.length} of a study document. Keep key facts, definitions, and formulas.\n\n${chunks[i]}`,
      config: {
        systemInstruction:
          'You are an expert study assistant. Produce a concise section summary retaining important terms and concepts.',
      },
    });
    if (response.text?.trim()) {
      partialSummaries.push(response.text.trim());
    }
  }

  const combined = partialSummaries.join('\n\n');
  return summarizeDocument(combined, apiKey);
}

/**
 * Evaluate an active-recall ("blurting") attempt against reference material.
 */
export async function evaluateRecall(topic: string, userText: string, context: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `A student is practicing active recall ("blurting") on the topic "${topic}". Evaluate what they wrote against the reference material. Identify concepts they covered well, concepts that are vague/incomplete, and crucial points they omitted or got wrong. Give an overall accuracy 0-100.\n\n=== REFERENCE MATERIAL ===\n${context || '(no reference material provided — evaluate on general correctness for the topic)'}\n\n=== STUDENT RECALL ===\n${userText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recallSchema,
      systemInstruction:
        'You are a supportive exam coach. Grade free-recall attempts fairly. Mark each concept status as exactly "covered", "partial", or "missed".',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Grounded AI tutor answer. Optionally injects RAG-retrieved context ahead of
 * the primary notes so the model can cite the most relevant passages.
 *
 * @param question - Student question
 * @param context - Primary notes / document text
 * @param apiKey - Optional BYO Gemini API key
 * @param ragContext - Optional retrieved chunk texts to prioritize
 */
export async function tutorAnswer(
  question: string,
  context: string,
  apiKey?: string,
  ragContext?: string[]
) {
  const ai = getClient(apiKey);
  const ragBlock =
    ragContext && ragContext.length > 0
      ? `\n\n=== RETRIEVED PASSAGES (most relevant) ===\n${ragContext.join('\n\n---\n\n')}\n`
      : '';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `You are helping a student understand their uploaded notes. Ground your answer in the provided material and say if something is not covered.${ragBlock}\n\n=== NOTES ===\n${context}\n\n=== QUESTION ===\n${question}`,
    config: {
      systemInstruction:
        'You are Fios AI Tutor, a friendly, precise study tutor. Answer clearly and concisely based primarily on the provided notes. Prefer retrieved passages when present. When explaining a process, flow, hierarchy, or architecture, include a Mermaid diagram inside a ```mermaid code block to visualize it.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return { answer: response.text.trim() };
}

/**
 * Process an image or audio clip with Gemini multimodal and return structured
 * Markdown study notes (plus any extracted code blocks).
 *
 * @param mediaBase64 - Raw base64 payload (no data-URL prefix required)
 * @param mimeType - e.g. image/png, image/jpeg, audio/webm, audio/mp3
 * @param apiKey - Optional BYO Gemini API key
 */
export async function processVisionOrAudio(
  mediaBase64: string,
  mimeType: string,
  apiKey?: string
): Promise<{ title: string; markdown: string; codeBlocks?: { language: string; code: string }[] }> {
  const ai = getClient(apiKey);
  const cleanB64 = mediaBase64.replace(/^data:[^;]+;base64,/, '');
  const isAudio = mimeType.toLowerCase().startsWith('audio/');
  const task = isAudio
    ? 'Transcribe this audio and turn it into structured study notes in Markdown. Capture spoken code faithfully in fenced code blocks.'
    : 'Analyze this image (whiteboard, slide, handwritten notes, or screenshot) and produce structured study notes in Markdown. Extract any visible code into fenced code blocks.';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: cleanB64 } },
          { text: task },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: mediaNotesSchema,
      systemInstruction:
        'You are an expert study assistant. Convert visual or spoken lecture material into clear, well-structured Markdown notes suitable for revision. Prefer headings, bullets, and labeled code fences.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Split text into overlapping chunks of roughly `targetWords` words, preferring
 * paragraph then sentence boundaries for more semantic coherence.
 *
 * @param text - Full document text
 * @param targetWords - Approximate words per chunk (default 500)
 * @param overlapWords - Words of overlap between consecutive chunks (default 50)
 * @returns Array of chunk strings
 */
export function chunkText(
  text: string,
  targetWords: number = 500,
  overlapWords: number = 50
): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (wordCount(normalized) <= targetWords) return [normalized];

  // Split into paragraphs; fall back to sentences for very long paragraphs.
  const paragraphs = normalized.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];
  for (const para of paragraphs) {
    if (wordCount(para) <= targetWords) {
      units.push(para);
    } else {
      const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
      for (const s of sentences) {
        const t = s.trim();
        if (t) units.push(t);
      }
    }
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push(current.join('\n\n'));
    // Keep a tail of ~overlapWords for the next chunk
    if (overlapWords > 0 && chunks.length > 0) {
      const words = chunks[chunks.length - 1].split(/\s+/);
      const overlap = words.slice(-Math.min(overlapWords, words.length)).join(' ');
      current = overlap ? [overlap] : [];
      currentWords = wordCount(overlap);
    } else {
      current = [];
      currentWords = 0;
    }
  };

  for (const unit of units) {
    const w = wordCount(unit);
    if (currentWords > 0 && currentWords + w > targetWords) {
      flush();
    }
    // If a single unit still exceeds target, hard-split by words
    if (w > targetWords) {
      const words = unit.split(/\s+/);
      for (let i = 0; i < words.length; i += targetWords - overlapWords) {
        const slice = words.slice(i, i + targetWords).join(' ');
        if (slice.trim()) chunks.push(slice.trim());
      }
      current = [];
      currentWords = 0;
      continue;
    }
    current.push(unit);
    currentWords += w;
  }
  if (current.length > 0 && currentWords > 0) {
    // Avoid duplicating pure-overlap remnants
    const candidate = current.join('\n\n');
    if (chunks.length === 0 || candidate !== chunks[chunks.length - 1]) {
      chunks.push(candidate);
    }
  }

  return chunks.filter((c) => c.trim().length > 0);
}

/** Tokenize for keyword / TF scoring (lowercase alphanumeric tokens, length >= 2). */
function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]{2,}/g) || []);
}

/**
 * Retrieve the top-k most relevant chunks for a query using simple TF/keyword
 * scoring (vector-less). Optionally, when `apiKey` is provided, a lightweight
 * Gemini re-rank can refine the top candidates — but keyword scoring is the
 * default path so RAG works without embeddings.
 *
 * @param chunks - Document chunks from {@link chunkText}
 * @param query - Natural-language query
 * @param apiKey - Optional; reserved for future embedding re-rank (unused by default)
 * @param topK - Number of chunks to return (default 5)
 */
export async function ragRetrieve(
  chunks: string[],
  query: string,
  apiKey?: string,
  topK: number = 5
): Promise<{ chunks: string[]; scores: number[] }> {
  void apiKey; // reserved for optional embedding path
  if (!chunks.length || !query?.trim()) {
    return { chunks: [], scores: [] };
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { chunks: chunks.slice(0, topK), scores: chunks.slice(0, topK).map(() => 0) };
  }

  const queryTf = new Map<string, number>();
  for (const t of queryTokens) {
    queryTf.set(t, (queryTf.get(t) || 0) + 1);
  }

  // Document frequency for simple IDF (rarer terms weigh more)
  const df = new Map<string, number>();
  const chunkTokenMaps = chunks.map((chunk) => {
    const tokens = tokenize(chunk);
    const chunkTf = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of tokens) {
      chunkTf.set(t, (chunkTf.get(t) || 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        df.set(t, (df.get(t) || 0) + 1);
      }
    }
    return { tokens, chunkTf };
  });
  const N = Math.max(chunks.length, 1);

  const scored = chunks.map((chunk, index) => {
    const { tokens, chunkTf } = chunkTokenMaps[index];
    if (tokens.length === 0) return { index, score: 0, chunk };

    let score = 0;
    for (const [term, qf] of queryTf) {
      const tf = chunkTf.get(term) || 0;
      if (tf > 0) {
        const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
        // TF-IDF weighted by query term frequency
        score += (tf / tokens.length) * qf * idf * (1 + Math.log(tf + 1));
      }
    }
    // Boost exact phrase presence lightly
    if (chunk.toLowerCase().includes(query.trim().toLowerCase())) {
      score += 0.5;
    }
    return { index, score, chunk };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const top = scored.filter((s) => s.score > 0).slice(0, topK);
  // If nothing matched, return the first k chunks as a soft fallback
  const result = top.length > 0 ? top : scored.slice(0, topK);

  return {
    chunks: result.map((r) => r.chunk),
    scores: result.map((r) => Math.round(r.score * 10000) / 10000),
  };
}

export type OralExamTurn = {
  question: string;
  rubricHint: string;
  followUp?: string;
  score: number;
  feedback: string;
  model: string;
};

/**
 * Mock oral examiner turn. Prefer Pro for deeper probing when requested.
 */
export async function runOralExamTurn(
  opts: {
    material: string;
    history?: { role: 'examiner' | 'student'; text: string }[];
    studentAnswer?: string;
    apiKey?: string;
    preferPro?: boolean;
  }
): Promise<OralExamTurn> {
  const history = opts.history || [];
  const transcript = history
    .map((h) => `${h.role === 'examiner' ? 'Examiner' : 'Student'}: ${h.text}`)
    .join('\n');
  const prompt = `You are a fair but rigorous oral examiner.
Study material:
${opts.material.slice(0, 24000)}

Prior dialogue:
${transcript || '(none — ask an opening question)'}

${opts.studentAnswer ? `Student's latest answer:\n${opts.studentAnswer}\n\nScore it briefly, then ask the next question.` : 'Ask a strong opening oral exam question.'}`;

  const { text, model } = await generateWithFallback({
    contents: prompt,
    apiKey: opts.apiKey,
    preferPro: opts.preferPro ?? true,
    config: {
      responseMimeType: 'application/json',
      responseSchema: oralExamSchema,
      systemInstruction:
        'You run viva-style oral exams. Questions should be clear for speaking aloud. Feedback is concise and constructive.',
    },
  });
  const parsed = JSON.parse(cleanJsonResponse(text));
  return {
    question: String(parsed.question || ''),
    rubricHint: String(parsed.rubricHint || ''),
    followUp: String(parsed.followUp || ''),
    score: Number(parsed.score) || 0,
    feedback: String(parsed.feedback || ''),
    model,
  };
}

export type OcclusionRegion = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Propose diagram occlusion masks from an image (base64) + optional hint text.
 */
export async function generateOcclusionMasks(
  opts: {
    imageBase64: string;
    mimeType?: string;
    hint?: string;
    apiKey?: string;
  }
): Promise<{ regions: OcclusionRegion[]; model: string }> {
  const mime = opts.mimeType || 'image/png';
  const ai = getClient(opts.apiKey);
  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: mime,
            data: opts.imageBase64.replace(/^data:[^;]+;base64,/, ''),
          },
        },
        {
          text: `Identify key labeled regions in this study diagram for occlusion flashcards.
Return bounding boxes as percentages (0-100) of image width/height.
${opts.hint ? `Focus: ${opts.hint}` : 'Cover the main labeled parts a student should recall.'}`,
        },
      ],
    },
  ];

  let lastErr: unknown;
  for (const model of [GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents as any,
        config: {
          responseMimeType: 'application/json',
          responseSchema: occlusionMaskSchema,
          systemInstruction:
            'You create diagram occlusion study regions. Boxes must stay within 0-100 and not cover the entire image.',
        },
      });
      const raw = extractText(response);
      if (!raw.trim()) throw new Error('No text returned from Gemini model.');
      const parsed = JSON.parse(cleanJsonResponse(raw));
      const regions: OcclusionRegion[] = Array.isArray(parsed?.regions)
        ? parsed.regions.map((r: any, i: number) => ({
            id: String(r.id || `r${i + 1}`),
            label: String(r.label || 'Region'),
            x: Math.min(100, Math.max(0, Number(r.x) || 0)),
            y: Math.min(100, Math.max(0, Number(r.y) || 0)),
            w: Math.min(100, Math.max(1, Number(r.w) || 10)),
            h: Math.min(100, Math.max(1, Number(r.h) || 10)),
          }))
        : [];
      return { regions, model };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'Occlusion failed'));
}

/**
 * Lightweight SaaS generate helper for /api/ai/generate (does not replace flashcards route).
 */
export async function saasGenerate(
  opts: {
    prompt: string;
    system?: string;
    apiKey?: string;
    preferPro?: boolean;
  }
): Promise<{ text: string; model: string }> {
  return generateWithFallback({
    contents: opts.prompt,
    apiKey: opts.apiKey,
    preferPro: opts.preferPro,
    config: {
      systemInstruction: opts.system || 'You are a helpful Fios study assistant.',
    },
  });
}

export type MindMapNode = {
  id: string;
  label: string;
  summary: string;
  parentId?: string;
};

export type MindMapResult = {
  title: string;
  nodes: MindMapNode[];
  edges: { source: string; target: string }[];
};

/**
 * Build a hierarchical mind-map graph from study notes.
 */
export async function generateMindMapFromText(
  text: string,
  apiKey?: string
): Promise<MindMapResult> {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create a hierarchical mind map of the key concepts in these notes. Use stable ids (n1, n2, …), short labels, one-sentence summaries, parentId for hierarchy, and edges for relationships.\n\n${String(text || '').slice(0, 28000)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: mindMapSchema,
      systemInstruction:
        'You are an expert study cartographer. Produce a clear hierarchical mind map with 5–25 nodes. Every non-root node should have a parentId. Include corresponding edges.',
    },
  });
  const raw = extractText(response);
  if (!raw.trim()) throw new Error('No text returned from Gemini model.');
  const parsed = JSON.parse(cleanJsonResponse(raw));
  const nodes: MindMapNode[] = Array.isArray(parsed?.nodes)
    ? parsed.nodes.map((n: any, i: number) => ({
        id: String(n.id || `n${i + 1}`),
        label: String(n.label || 'Concept'),
        summary: String(n.summary || ''),
        ...(n.parentId ? { parentId: String(n.parentId) } : {}),
      }))
    : [];
  const edges = Array.isArray(parsed?.edges)
    ? parsed.edges.map((e: any) => ({
        source: String(e.source || ''),
        target: String(e.target || ''),
      })).filter((e: { source: string; target: string }) => e.source && e.target)
    : nodes
        .filter((n) => n.parentId)
        .map((n) => ({ source: n.parentId!, target: n.id }));
  return {
    title: String(parsed?.title || 'Mind Map'),
    nodes,
    edges,
  };
}

export type MnemonicResult = {
  acronym?: string;
  story?: string;
  rhyme?: string;
  tip?: string;
};

/**
 * Generate memory aids for one flashcard.
 */
export async function generateMnemonic(
  cardFront: string,
  cardBack: string,
  style?: string,
  apiKey?: string
): Promise<MnemonicResult> {
  const ai = getClient(apiKey);
  const styleHint = style?.trim()
    ? ` Prefer this style: ${style.trim()}.`
    : ' Prefer the most memorable mix of acronym, story, rhyme, and tip.';
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create mnemonics for this flashcard.\nFront: ${cardFront}\nBack: ${cardBack}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: mnemonicSchema,
      systemInstruction: `You invent vivid, classroom-safe memory aids for students.${styleHint} Leave unused fields as empty strings.`,
    },
  });
  const raw = extractText(response);
  if (!raw.trim()) throw new Error('No text returned from Gemini model.');
  const parsed = JSON.parse(cleanJsonResponse(raw));
  const out: MnemonicResult = {};
  if (parsed?.acronym) out.acronym = String(parsed.acronym);
  if (parsed?.story) out.story = String(parsed.story);
  if (parsed?.rhyme) out.rhyme = String(parsed.rhyme);
  if (parsed?.tip) out.tip = String(parsed.tip);
  if (!out.tip && !out.acronym && !out.story && !out.rhyme) {
    out.tip = 'Link a vivid image of the front cue to the key idea on the back.';
  }
  return out;
}

export type SocraticTurnResult = {
  reply: string;
  hintsUsed: number;
  studentOnTrack: boolean;
};

/**
 * Socratic tutor turn. NEVER reveals the final answer — only leading questions.
 */
export async function socraticTutorTurn(opts: {
  cardFront: string;
  cardBack: string;
  history: { role: string; content: string }[];
  studentMessage: string;
  apiKey?: string;
}): Promise<SocraticTurnResult> {
  const ai = getClient(opts.apiKey);
  const historyBlock = (opts.history || [])
    .map((h) => `${h.role === 'tutor' || h.role === 'assistant' ? 'Tutor' : 'Student'}: ${h.content}`)
    .join('\n');
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Card prompt (front): ${opts.cardFront}
Private answer key (back — NEVER reveal verbatim or paraphrase as the answer): ${opts.cardBack}

Prior dialogue:
${historyBlock || '(none)'}

Student's latest message:
${opts.studentMessage}

Respond with leading questions and gentle scaffolds only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: socraticSchema,
      systemInstruction:
        'You are a Socratic study tutor. NEVER reveal the final answer, never quote the answer key, and never say the solution outright. Ask leading questions, nudge misconceptions, and celebrate partial progress. Keep replies concise.',
    },
  });
  const raw = extractText(response);
  if (!raw.trim()) throw new Error('No text returned from Gemini model.');
  const parsed = JSON.parse(cleanJsonResponse(raw));
  return {
    reply: String(parsed?.reply || 'What part of the prompt feels clearest to you so far?'),
    hintsUsed: Math.min(3, Math.max(0, Number(parsed?.hintsUsed) || 0)),
    studentOnTrack: Boolean(parsed?.studentOnTrack),
  };
}

/** Cloze + Q&A cards from a transcript. */
export async function generateClozeAndQaFromTranscript(transcript: string, apiKey?: string) {
  const { text: raw } = await generateWithFallback({
    contents: `From this transcript, create cloze-deletion cards and Q&A cards for spaced repetition:\n\n${transcript.slice(0, 28000)}`,
    apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: clozeCardSchema,
      systemInstruction:
        'Mix cloze (use {{c1::answer}} style on the front) and normal Q&A. Keep cards atomic.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Course-scoped grounded chat with inline citations. */
export async function groundedDocumentChat(opts: {
  question: string;
  passages: { text: string; page?: number; paragraph?: number; chunkIndex?: number }[];
  apiKey?: string;
}) {
  const ctx = opts.passages
    .map(
      (p, i) =>
        `[#${i}] page=${p.page ?? '?'} para=${p.paragraph ?? '?'} chunk=${p.chunkIndex ?? i}\n${p.text}`
    )
    .join('\n\n---\n\n');
  const { text: raw } = await generateWithFallback({
    contents: `Answer using ONLY the passages. Cite quotes.\n\nPASSAGES:\n${ctx}\n\nQUESTION:\n${opts.question}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: groundedChatSchema,
      systemInstruction:
        'Ground every claim in the passages. citations[].quote must be verbatim. If unknown, say so.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Viva / presentation coach turn. */
export async function vivaCoachTurn(opts: {
  content: string;
  transcript?: string;
  wpm?: number;
  fillerCount?: number;
  history?: { role: string; content: string }[];
  apiKey?: string;
}) {
  const hist = (opts.history || []).map((h) => `${h.role}: ${h.content}`).join('\n');
  const { text: raw } = await generateWithFallback({
    contents: `You are a professor running a viva / presentation rehearsal.
Study content:
${opts.content.slice(0, 20000)}

Student spoken transcript (optional):
${opts.transcript || '(none)'}
Estimated WPM: ${opts.wpm ?? 'unknown'}; filler words heard: ${opts.fillerCount ?? 'unknown'}

Prior:
${hist || '(ask opening viva question)'}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: vivaCoachSchema,
      systemInstruction:
        'Ask professor-style viva questions. Comment on pacing and filler words when metrics are present.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Mini-quiz for a mind-map node. */
export async function mindMapNodeQuiz(
  label: string,
  summary: string,
  context?: string,
  apiKey?: string
) {
  return generateQuizFromText(
    `Concept: ${label}\nSummary: ${summary}\nContext: ${context || ''}`,
    apiKey,
    3
  );
}

/** Protégé / Feynman — AI plays confused first-year student. */
export async function feynmanStudentTurn(opts: {
  topic: string;
  teacherExplanation?: string;
  explanation?: string;
  history?: { role: string; content: string }[];
  apiKey?: string;
}) {
  const explanation = opts.teacherExplanation || opts.explanation || '';
  const hist = (opts.history || []).map((h) => `${h.role}: ${h.content}`).join('\n');
  const { text: raw } = await generateWithFallback({
    contents: `Topic: ${opts.topic}
Teacher's explanation to you (a confused first-year):
${explanation}

Prior:
${hist || '(none)'}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: feynmanSchema,
      systemInstruction:
        'You are a confused but curious first-year student. Ask genuine clarifying questions, probe edge cases, and never pretend you fully understand. Score how accurate/complete the teacher was (0-100).',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Elaborative interrogation after Hard / fail-twice. */
export async function elaborativeInterrogation(opts: {
  front?: string;
  back?: string;
  cardFront?: string;
  cardBack?: string;
  priorTopic?: string;
  apiKey?: string;
}) {
  const front = opts.front || opts.cardFront || '';
  const back = opts.back || opts.cardBack || '';
  const { text: raw } = await generateWithFallback({
    contents: `Flashcard front: ${front}\nBack: ${back}\nPrior topic to connect: ${opts.priorTopic || 'general course knowledge'}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: elaborateSchema,
      systemInstruction:
        'Help the student elaborate: why the answer is true, and how it connects to a prior topic. End with a short prompt they should answer before moving on.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Dual-coding micro-asset hints for a card. */
export async function generateDualCodeAsset(opts: {
  front?: string;
  back?: string;
  cardFront?: string;
  cardBack?: string;
  apiKey?: string;
}) {
  const front = opts.front || opts.cardFront || '';
  const back = opts.back || opts.cardBack || '';
  const { text: raw } = await generateWithFallback({
    contents: `Create dual-coding micro-assets for this card.\nFront: ${front}\nBack: ${back}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: dualCodeSchema,
      systemInstruction:
        'Suggest a simple icon hint, optional tiny mermaid diagram, and a short audio mnemonic script (<40 words).',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Alias used by study routes. */
export async function dualCodeMicroAsset(opts: {
  cardFront?: string;
  cardBack?: string;
  front?: string;
  back?: string;
  apiKey?: string;
}) {
  return generateDualCodeAsset(opts);
}

/**
 * Grade a spoken active-recall attempt vs the card answer.
 * Returns FSRS-style rating 1–4 plus brief feedback.
 */
export async function gradeSpokenRecall(opts: {
  front: string;
  back: string;
  spoken: string;
  apiKey?: string;
}): Promise<{ rating: 1 | 2 | 3 | 4; feedback: string; accuracy: number }> {
  const { text: raw } = await generateWithFallback({
    contents: `Flashcard front (prompt): ${opts.front}
Correct back (answer key): ${opts.back}
Student's spoken answer (STT transcript): ${opts.spoken}

Grade how well the spoken answer covers the correct answer. Be fair to STT noise.`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: voiceGradeSchema,
      systemInstruction:
        'You grade spoken active recall. rating is FSRS: 1=Again (missed), 2=Hard (partial), 3=Good, 4=Easy. Ignore minor STT typos.',
    },
  });
  const parsed = JSON.parse(cleanJsonResponse(raw));
  const rating = Math.min(4, Math.max(1, Math.round(Number(parsed?.rating) || 2))) as 1 | 2 | 3 | 4;
  return {
    rating,
    feedback: String(parsed?.feedback || ''),
    accuracy: Math.min(100, Math.max(0, Number(parsed?.accuracy) || 0)),
  };
}

/** Full-length mock exam: mix of MCQ / short / essay from module docs. */
export async function generateMockExam(opts: {
  moduleCode: string;
  durationMin?: number;
  sourceText: string;
  apiKey?: string;
}) {
  const mins = Math.min(180, Math.max(20, Number(opts.durationMin) || 90));
  const { text: raw } = await generateWithFallback({
    contents: `Module: ${opts.moduleCode}
Target duration: ${mins} minutes.
Create a full mock exam mixing multiple-choice, short-answer, and essay questions from these notes/docs:

${opts.sourceText.slice(0, 40000)}`,
    apiKey: opts.apiKey,
    preferPro: true,
    config: {
      responseMimeType: 'application/json',
      responseSchema: mockExamSchema,
      systemInstruction:
        'Build a realistic timed mock exam. Cover several topics. Include answerKey for grading. Mark estimated minutes per question.',
    },
  });
  const parsed = JSON.parse(cleanJsonResponse(raw));
  return { ...parsed, durationMin: mins, moduleCode: opts.moduleCode };
}

/** Grade mock exam answers → rubric + weak-topic diagnostic scorecard. */
export async function gradeMockExam(opts: {
  exam: unknown;
  answers: Record<string, string>;
  apiKey?: string;
}) {
  const { text: raw } = await generateWithFallback({
    contents: `EXAM JSON:\n${JSON.stringify(opts.exam).slice(0, 30000)}\n\nSTUDENT ANSWERS:\n${JSON.stringify(opts.answers).slice(0, 20000)}`,
    apiKey: opts.apiKey,
    preferPro: true,
    config: {
      responseMimeType: 'application/json',
      responseSchema: mockExamGradeSchema,
      systemInstruction:
        'Grade fairly. Produce a Diagnostic Scorecard with weakTopics ranked by severity. Rubric feedback should be actionable.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}

/** Extract deadlines / exams from syllabus text. */
export async function parseSyllabusEvents(opts: {
  text: string;
  moduleCode?: string;
  apiKey?: string;
}) {
  const { text: raw } = await generateWithFallback({
    contents: `Module code hint: ${opts.moduleCode || '(unknown)'}\n\nSyllabus / course outline text:\n${opts.text.slice(0, 40000)}`,
    apiKey: opts.apiKey,
    config: {
      responseMimeType: 'application/json',
      responseSchema: syllabusParseSchema,
      systemInstruction:
        'Extract assignment deadlines, exams, quizzes, and other dated academic events. Prefer ISO dates (YYYY-MM-DD). Skip vague undated items.',
    },
  });
  return JSON.parse(cleanJsonResponse(raw));
}
