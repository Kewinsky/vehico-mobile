export type PaidFeature = 'pdf_report' | 'ocr' | 'ai_listing';

/**
 * Vehico uses one-time payments (no subscriptions).
 * In v1 this is expected to be driven by a backend endpoint / Supabase Edge Function.
 */
export const stripeService = {
  async startOneTimePayment(_params: { feature: PaidFeature; vehicleId: string }) {
    throw new Error('Payments not configured yet. Implement via Stripe + backend webhook.');
  },
};

