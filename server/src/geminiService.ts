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
} from './schemas.js';

dotenv.config();

const serverApiKey = process.env.GEMINI_API_KEY;

/** Primary Gemini model used for structured study generation. */
const MODEL_NAME = 'gemini-3.8-flash';

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

function cleanJsonResponse(rawText: string): string {
  return rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
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
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: flashcardSchema,
      systemInstruction: 'You are an expert study assistant. Create high-quality, concise study flashcards covering key concepts.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

/**
 * Generate a multiple-choice quiz from study notes.
 * @param studyNotes - Raw lecture / note text
 * @param apiKey - Optional BYO Gemini API key
 */
export async function generateQuizFromText(studyNotes: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a 5-question multiple-choice quiz based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: 'You are an expert tutor. Create clear multiple choice questions with 4 distinct options.',
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
