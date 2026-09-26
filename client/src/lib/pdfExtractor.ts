import * as pdfjsLib from 'pdfjs-dist';

// Set up worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let extractedText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Safely check if items exists and is an array to prevent crashes
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      
      const pageText = items
        .map((item: any) => item.str || '')
        .join(' ');
        
      extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
    }

    return extractedText.trim();
  } catch (err: any) {
    console.error("PDF Extraction Error on Mobile:", err);
    throw new Error(err.message || "Could not parse PDF on mobile. Try copying/pasting text instead.");
  }
}