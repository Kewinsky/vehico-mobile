/** Must match Supabase Auth → Email OTP length (hosted default is often 8). */
export const EMAIL_OTP_LENGTH = 8;

export function isValidEmailOtpLength(length: number): boolean {
  return length === EMAIL_OTP_LENGTH;
}

export function normalizeEmailOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
}
