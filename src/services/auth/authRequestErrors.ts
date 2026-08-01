/** Shared Auth API error classifiers for OTP / captcha flows. */

export function isRateLimitError(message: string | undefined): boolean {
  const msg = message?.toLowerCase() ?? "";
  return (
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("429") ||
    msg.includes("email rate limit")
  );
}

export function isCaptchaError(message: string | undefined): boolean {
  const msg = message?.toLowerCase() ?? "";
  return (
    msg.includes("captcha") ||
    msg.includes("turnstile") ||
    msg.includes("challenge")
  );
}

export function isOtpExpiredOrInvalid(message: string | undefined): boolean {
  const msg = message?.toLowerCase() ?? "";
  return (
    msg.includes("expired") ||
    msg.includes("invalid") ||
    msg.includes("otp") ||
    msg.includes("token")
  );
}
