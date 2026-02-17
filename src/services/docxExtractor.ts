export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || '').trim();

    if (!text) {
      throw new Error('No readable text found in DOCX file.');
    }

    return text;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    if (error instanceof Error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
    throw new Error('Failed to extract text from DOCX.');
  }
};
