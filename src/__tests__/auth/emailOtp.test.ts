import {
  EMAIL_OTP_LENGTH,
  isValidEmailOtpLength,
  normalizeEmailOtpInput,
} from "../../services/auth/emailOtp";

describe("emailOtp", () => {
  it("expects 8-digit codes", () => {
    expect(EMAIL_OTP_LENGTH).toBe(8);
    expect(isValidEmailOtpLength(8)).toBe(true);
    expect(isValidEmailOtpLength(6)).toBe(false);
  });

  it("normalizeEmailOtpInput strips non-digits and caps length", () => {
    expect(normalizeEmailOtpInput("12 34-5678")).toBe("12345678");
    expect(normalizeEmailOtpInput("12345678901")).toBe("12345678");
  });
});
