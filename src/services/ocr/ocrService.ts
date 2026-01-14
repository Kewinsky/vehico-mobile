export type OcrResult = {
  rawText: string;
  confidence?: number;
};

/**
 * OCR is intentionally abstracted behind a service layer.
 * Implementation should call a backend function (Google Cloud Vision) and return extracted text.
 */
export const ocrService = {
  async extractTextFromImage(_params: { imageUri: string }): Promise<OcrResult> {
    throw new Error('OCR not configured yet. Implement via Google Cloud Vision behind a backend.');
  },
};

