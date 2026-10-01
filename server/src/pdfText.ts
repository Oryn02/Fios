/**
 * Structured PDF extraction with page + paragraph provenance for citations / RAG.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type PdfParagraph = {
  page: number;
  paragraph: number;
  text: string;
};

export type PdfExtractResult = {
  text: string;
  paragraphs: PdfParagraph[];
  pageCount: number;
};

function splitParagraphs(pageText: string): string[] {
  return pageText
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export async function extractPdfStructuredFromBuffer(buf: Buffer): Promise<PdfExtractResult> {
  if (!buf?.length) return { text: '', paragraphs: [], pageCount: 0 };

  const data = new Uint8Array(buf);
  const loadingTask = getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const paragraphs: PdfParagraph[] = [];
  const pageParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    // Rebuild with newlines when Y jumps (paragraph-ish)
    let lastY: number | null = null;
    const lines: string[] = [];
    let line = '';
    for (const item of items) {
      if (!item || typeof item !== 'object' || !('str' in item)) continue;
      const str = String((item as { str?: string }).str || '');
      const tr = (item as { transform?: number[] }).transform;
      const y = Array.isArray(tr) ? tr[5] : null;
      if (lastY != null && y != null && Math.abs(lastY - y) > 10 && line.trim()) {
        lines.push(line.trim());
        line = str;
      } else {
        line += (line && !line.endsWith(' ') && str && !str.startsWith(' ') ? ' ' : '') + str;
      }
      if (y != null) lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    const pageText = lines.join('\n\n').trim();
    if (pageText) {
      pageParts.push(`--- Page ${pageNum} ---\n${pageText}`);
      const paras = splitParagraphs(pageText);
      paras.forEach((text, idx) => {
        paragraphs.push({ page: pageNum, paragraph: idx + 1, text });
      });
    }
  }

  try {
    await pdf.destroy();
  } catch {
    /* ignore */
  }

  return {
    text: pageParts.join('\n\n').trim(),
    paragraphs,
    pageCount: pdf.numPages,
  };
}

/** Back-compat wrapper — plain text with page markers. */
export async function extractPdfTextFromBuffer(buf: Buffer): Promise<string> {
  const result = await extractPdfStructuredFromBuffer(buf);
  return result.text;
}
