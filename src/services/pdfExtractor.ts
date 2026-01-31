// Simple PDF text extraction utility
// This uses pdfjs-dist library

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    console.log('Starting PDF text extraction...');
    
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    console.log('PDF.js loaded, version:', pdfjsLib.version);
    
    // Try to import the worker from the package
    try {
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      console.log('Worker loaded from package');
    } catch (workerError) {
      console.warn('Could not load worker from package, trying CDN...', workerError);
      // Fallback to CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      console.log('Worker configured to use CDN');
    }
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded as ArrayBuffer, size:', arrayBuffer.byteLength);
    
    // Load PDF document with additional options
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          // Handle both string and object items
          if (typeof item === 'string') return item;
          return item.str || '';
        })
        .filter(text => text.trim().length > 0)
        .join(' ');
      
      if (pageText.trim().length > 0) {
        fullText += pageText + '\n\n';
      }
      console.log(`Page ${pageNum} extracted, text length: ${pageText.length}`);
    }
    
    const finalText = fullText.trim();
    console.log('PDF extraction complete, total text length:', finalText.length);
    
    if (finalText.length === 0) {
      throw new Error('No text content found in PDF. The PDF may contain only images or scanned documents.');
    }
    
    return finalText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
  }
};
