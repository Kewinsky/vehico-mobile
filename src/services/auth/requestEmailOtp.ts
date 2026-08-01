import { supabase } from "../supabase/client";
import { isCaptchaError, isRateLimitError } from "./authRequestErrors";

export type RequestEmailOtpResult =
  | { ok: true }
  | { ok: false; kind: "rate_limit" | "captcha" | "error"; error?: unknown };

/**
 * Requests a passwordless email OTP. Pass `captchaToken` when Turnstile is enabled.
 */
export async function requestEmailOtp(input: {
  email: string;
  captchaToken?: string | null;
}): Promise<RequestEmailOtpResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: true,
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : null),
    },
  });

  if (!error) return { ok: true };

  if (isRateLimitError(error.message)) {
    return { ok: false, kind: "rate_limit", error };
  }
  if (isCaptchaError(error.message)) {
    return { ok: false, kind: "captcha", error };
  }
  return { ok: false, kind: "error", error };
}
