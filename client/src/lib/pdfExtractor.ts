import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// Bundle the worker with Vite so mobile Safari does not depend on a CDN worker.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;
  try {
    GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    workerReady = true;
  } catch (err) {
    console.warn('[pdfExtractor] Failed to set workerSrc', err);
  }
}

export interface PdfParagraph {
  page: number;
  paragraph: number;
  text: string;
}

export interface StructuredPdfExtract {
  text: string;
  paragraphs: PdfParagraph[];
  pageCount: number;
}

/**
 * Split page text into rough paragraphs (blank-line / long-gap heuristics).
 */
function splitParagraphs(pageText: string, page: number): PdfParagraph[] {
  const chunks = pageText
    .split(/\n{2,}|\r\n{2,}/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0);
  // Fallback: single block if no blank-line splits
  const parts = chunks.length > 0 ? chunks : pageText.replace(/\s+/g, ' ').trim()
    ? [pageText.replace(/\s+/g, ' ').trim()]
    : [];
  return parts.map((text, i) => ({ page, paragraph: i + 1, text }));
}

async function loadPdfFromSource(
  source: File | ArrayBuffer | Uint8Array
): Promise<{ pdf: any; pageCount: number }> {
  ensurePdfWorker();
  let data: Uint8Array;
  if (source instanceof File) {
    data = new Uint8Array(await source.arrayBuffer());
  } else if (source instanceof ArrayBuffer) {
    data = new Uint8Array(source);
  } else {
    data = source;
  }
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  return { pdf, pageCount: pdf.numPages };
}

function cleanupPdf(pdf: any) {
  try {
    if (typeof pdf?.cleanup === 'function') pdf.cleanup();
    else if (typeof pdf?.destroy === 'function') void pdf.destroy();
  } catch {
    /* ignore */
  }
}

/**
 * Structured PDF extract with page + paragraph provenance for citations / RAG.
 */
export async function extractStructuredFromPDF(
  source: File | ArrayBuffer | Uint8Array
): Promise<StructuredPdfExtract> {
  try {
    const { pdf, pageCount } = await loadPdfFromSource(source);
    const paragraphs: PdfParagraph[] = [];
    let extractedText = '';

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      // Preserve soft line breaks from y-position jumps when available
      let pageLines = '';
      let lastY: number | null = null;
      for (const item of items as any[]) {
        const str = item?.str || '';
        const y = typeof item?.transform?.[5] === 'number' ? item.transform[5] : null;
        if (lastY != null && y != null && Math.abs(lastY - y) > 8) {
          pageLines += '\n';
        } else if (pageLines && !pageLines.endsWith('\n') && !pageLines.endsWith(' ')) {
          pageLines += ' ';
        }
        pageLines += str;
        if (y != null) lastY = y;
      }
      const pageText = pageLines.trim();
      extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      paragraphs.push(...splitParagraphs(pageText, pageNum));
    }

    cleanupPdf(pdf);
    return {
      text: extractedText.trim(),
      paragraphs,
      pageCount,
    };
  } catch (err: any) {
    console.error('PDF Structured Extraction Error:', err);
    const msg = err?.message || String(err) || 'Could not parse PDF';
    throw new Error(msg);
  }
}

/**
 * Client-side PDF text extraction. Prefer server `/api/upload/pdf` on iOS
 * when this fails (worker / memory limits); Android desktop use this path freely.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const structured = await extractStructuredFromPDF(file);
  return structured.text;
}
