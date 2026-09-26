/**
 * Server-side PDF text extraction (Node / Render).
 * Uses pdfjs-dist legacy build so iOS clients can upload and get text without
 * relying on a browser PDF.js worker.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdfTextFromBuffer(buf: Buffer): Promise<string> {
  if (!buf?.length) return '';

  const data = new Uint8Array(buf);
  const loadingTask = getDocument({
    data,
    // No browser worker in Node — run on the main thread.
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = Array.isArray(textContent?.items) ? textContent.items : [];
    const pageText = items
      .map((item: unknown) => {
        if (item && typeof item === 'object' && 'str' in item) {
          return String((item as { str?: string }).str || '');
        }
        return '';
      })
      .join(' ')
      .trim();
    if (pageText) parts.push(`--- Page ${pageNum} ---\n${pageText}`);
  }

  try {
    await pdf.destroy();
  } catch {
    /* ignore */
  }

  return parts.join('\n\n').trim();
}
