export type PdfReportParams = {
  vehicleId: string;
};

/**
 * PDF generation must be server-side (HTML -> PDF).
 * Frontend should request generation after payment is confirmed.
 */
export const pdfService = {
  async generateVehicleReport(_params: PdfReportParams): Promise<{ url: string }> {
    throw new Error('PDF generation not configured yet. Implement server-side HTML→PDF.');
  },
};

