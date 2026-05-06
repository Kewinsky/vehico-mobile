import { parseMagicLinkError } from "../../services/auth/magicLinkDeepLink";

describe("parseMagicLinkError", () => {
  it("returns null when no error params", () => {
    expect(
      parseMagicLinkError("vehico://auth/magic-link#access_token=x&refresh_token=y"),
    ).toBeNull();
  });

  it("detects expired via error_description in fragment", () => {
    const url =
      "vehico://auth/magic-link#error=access_denied&error_description=otp_expired";
    expect(parseMagicLinkError(url)).toBe("expired");
  });

  it("detects invalid token in query string", () => {
    const url =
      "vehico://auth/magic-link?error_code=invalid_token&error=invalid_request";
    expect(parseMagicLinkError(url)).toBe("expired");
  });

  it("maps generic errors to expired (current product behavior)", () => {
    expect(parseMagicLinkError("vehico://auth/magic-link#error=unknown")).toBe(
      "expired",
    );
  });
});
