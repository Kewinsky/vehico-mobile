/** Demo account for App Store review (email + password in Supabase Auth). */
export const APP_STORE_REVIEW_EMAIL = "vehico.review@yahoo.com";

export function isAppStoreReviewEmail(email: string): boolean {
  return email.trim().toLowerCase() === APP_STORE_REVIEW_EMAIL.toLowerCase();
}
