import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';
import {
  generateMockExam,
  gradeMockExam,
  isPlatformKey,
} from '../geminiService.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

/**
 * POST /api/exam/mock-generate
 * Body: { moduleCode, durationMin? }
 * Pulls documents / notes for the module and generates a mixed mock exam.
 */
router.post('/mock-generate', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const moduleCode = String(req.body?.moduleCode || '').trim();
    if (!moduleCode) {
      res.status(400).json({ error: 'moduleCode is required' });
      return;
    }
    const durationMin = req.body?.durationMin != null ? Number(req.body.durationMin) : 90;
    const db = dbFor(req);
    let sourceText = String(req.body?.text || '').trim();

    if (!sourceText && db) {
      const parts: string[] = [];
      const { data: docs } = await db
        .from('documents')
        .select('title, content, module_code')
        .eq('user_id', req.userId!)
        .ilike('module_code', moduleCode)
        .limit(12);
      for (const d of docs || []) {
        const body = String((d as any).content || '').trim();
        if (body) parts.push(`# ${(d as any).title || 'Doc'}\n${body.slice(0, 8000)}`);
      }
      const { data: materials } = await db
        .from('lms_materials')
        .select('title, content_text, module_code')
        .eq('user_id', req.userId!)
        .ilike('module_code', moduleCode)
        .limit(8);
      for (const m of materials || []) {
        const body = String((m as any).content_text || '').trim();
        if (body) parts.push(`# ${(m as any).title || 'LMS'}\n${body.slice(0, 6000)}`);
      }
      sourceText = parts.join('\n\n---\n\n');
    }

    if (!sourceText.trim()) {
      res.status(400).json({
        error:
          'No source text for this module. Upload documents / LMS materials, or pass `text` in the body.',
      });
      return;
    }

    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(sourceText.slice(0, 12000));
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }

    const exam = await generateMockExam({
      moduleCode,
      durationMin,
      sourceText,
      apiKey,
    });
    await recordUsage(req.userId!, estimate, billed);

    let examId: string | null = null;
    try {
      if (db) {
        const { data } = await db
          .from('mock_exams')
          .insert({
            user_id: req.userId,
            module_code: moduleCode,
            title: exam.title || `${moduleCode} Mock Exam`,
            duration_min: exam.durationMin || durationMin,
            questions: exam.questions || [],
            status: 'ready',
          })
          .select('id')
          .maybeSingle();
        examId = data?.id || null;
      }
    } catch {
      /* optional table */
    }

    res.json({ ...exam, examId });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Mock exam generation failed',
    });
  }
});

/**
 * POST /api/exam/mock-grade
 * Body: { exam | examId, answers: Record<id, string> }
 */
router.post('/mock-grade', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const answers =
      req.body?.answers && typeof req.body.answers === 'object'
        ? (req.body.answers as Record<string, string>)
        : {};
    if (!Object.keys(answers).length) {
      res.status(400).json({ error: 'answers object is required' });
      return;
    }

    let exam = req.body?.exam;
    const examId = String(req.body?.examId || '').trim();
    const db = dbFor(req);

    if (!exam && examId && db) {
      const { data } = await db
        .from('mock_exams')
        .select('*')
        .eq('id', examId)
        .eq('user_id', req.userId!)
        .maybeSingle();
      if (data) {
        exam = {
          title: data.title,
          durationMin: data.duration_min,
          questions: data.questions,
          moduleCode: data.module_code,
        };
      }
    }

    if (!exam) {
      res.status(400).json({ error: 'exam or examId is required' });
      return;
    }

    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(JSON.stringify(exam).slice(0, 8000), JSON.stringify(answers));
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }

    const result = await gradeMockExam({ exam, answers, apiKey });
    await recordUsage(req.userId!, estimate, billed);

    if (examId && db) {
      try {
        await db
          .from('mock_exams')
          .update({
            answers,
            grade_result: result,
            status: 'graded',
            graded_at: new Date().toISOString(),
          })
          .eq('id', examId)
          .eq('user_id', req.userId!);
      } catch {
        /* optional */
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Mock exam grading failed',
    });
  }
});

export default router;
