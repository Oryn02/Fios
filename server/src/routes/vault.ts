import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

function mdEscape(s: string): string {
  return String(s || '').replace(/\r\n/g, '\n');
}

function wikilink(title: string): string {
  return `[[${title.replace(/[\[\]]/g, '')}]]`;
}

/** POST /api/vault/export-module — return markdown files for Obsidian/Notion */
router.post('/export-module', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const moduleCode = String(req.body?.moduleCode || '').trim();
    if (!moduleCode) {
      res.status(400).json({ error: 'moduleCode is required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const files: { path: string; content: string }[] = [];
    const folder = moduleCode.replace(/[^\w\-]+/g, '_');

    const { data: decks } = await db
      .from('decks')
      .select('id, title, cards(question, answer, card_type, starter_code, code_language)')
      .eq('user_id', req.userId!)
      .eq('module_code', moduleCode);

    const { data: docs } = await db
      .from('documents')
      .select('title, content, summary, glossary')
      .eq('user_id', req.userId!)
      .eq('module_code', moduleCode);

    const { data: quizzes } = await db
      .from('mcq_quizzes')
      .select('title, questions')
      .eq('user_id', req.userId!)
      .eq('module_code', moduleCode);

    const indexLinks: string[] = [`# ${moduleCode}`, '', '## Decks'];
    for (const deck of decks || []) {
      const safe = String(deck.title || 'Deck').replace(/[^\w\- ]+/g, '').trim() || 'Deck';
      indexLinks.push(`- ${wikilink(safe)}`);
      let body = `# ${deck.title}\n\nModule: ${wikilink(moduleCode)}\n\n`;
      for (const c of (deck as any).cards || []) {
        body += `## ${mdEscape(c.question || '')}\n\n${mdEscape(c.answer || '')}\n\n`;
        if (c.card_type === 'code' && c.starter_code) {
          const lang = c.code_language || 'javascript';
          body += `\`\`\`${lang}\n${c.starter_code}\n\`\`\`\n\n`;
        }
      }
      files.push({ path: `${folder}/decks/${safe}.md`, content: body });
    }

    indexLinks.push('', '## Notes');
    for (const doc of docs || []) {
      const safe = String(doc.title || 'Note').replace(/[^\w\- ]+/g, '').trim() || 'Note';
      indexLinks.push(`- ${wikilink(safe)}`);
      let body = `# ${doc.title}\n\nModule: ${wikilink(moduleCode)}\n\n`;
      if (doc.summary) body += `> ${mdEscape(doc.summary)}\n\n`;
      body += mdEscape(doc.content || '') + '\n';
      if (Array.isArray(doc.glossary) && doc.glossary.length) {
        body += '\n## Glossary\n\n';
        for (const g of doc.glossary as any[]) {
          body += `- **${g.term}**: ${g.definition}\n`;
        }
      }
      // Preserve LaTeX-ish $...$ already in content
      files.push({ path: `${folder}/notes/${safe}.md`, content: body });
    }

    indexLinks.push('', '## Quizzes');
    for (const q of quizzes || []) {
      const safe = String(q.title || 'Quiz').replace(/[^\w\- ]+/g, '').trim() || 'Quiz';
      indexLinks.push(`- ${wikilink(safe)}`);
      let body = `# ${q.title}\n\nModule: ${wikilink(moduleCode)}\n\n`;
      const questions = Array.isArray(q.questions) ? q.questions : [];
      questions.forEach((qq: any, i: number) => {
        body += `## Q${i + 1}. ${qq.question || ''}\n\n`;
        (qq.options || []).forEach((opt: string, oi: number) => {
          body += `${oi === qq.correctIndex ? '- [x]' : '- [ ]'} ${opt}\n`;
        });
        if (qq.explanation) body += `\n*${qq.explanation}*\n`;
        body += '\n';
      });
      files.push({ path: `${folder}/quizzes/${safe}.md`, content: body });
    }

    files.unshift({
      path: `${folder}/index.md`,
      content: indexLinks.join('\n') + '\n',
    });

    res.json({ moduleCode, files, count: files.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Export failed' });
  }
});

export default router;
