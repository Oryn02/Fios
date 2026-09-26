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

/**
 * Client-side PDF text extraction. Prefer server `/api/upload/pdf` on iOS
 * when this fails (worker / memory limits); Android desktop use this path freely.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  ensurePdfWorker();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    let extractedText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      const pageText = items
        .map((item: any) => item?.str || '')
        .join(' ');
      extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
    }

    try {
      // pdfjs v4+ uses cleanup(); older builds used destroy()
      const doc = pdf as { cleanup?: () => void; destroy?: () => Promise<void> };
      if (typeof doc.cleanup === 'function') doc.cleanup();
      else if (typeof doc.destroy === 'function') await doc.destroy();
    } catch {
      /* ignore */
    }

    return extractedText.trim();
  } catch (err: any) {
    console.error('PDF Extraction Error on Mobile:', err);
    const msg = err?.message || String(err) || 'Could not parse PDF';
    throw new Error(msg);
  }
}
