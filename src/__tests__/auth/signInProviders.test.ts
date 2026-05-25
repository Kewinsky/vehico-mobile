import {
  DEFAULT_OAUTH_DISPLAY_NAME,
  displayNameFromAppleFullName,
  displayNameFromIdentityData,
  resolveOAuthUserDisplayName,
  shouldPromptDisplayNameInOnboarding,
  userSignedInWithOAuth,
} from "../../services/auth/signInProviders";

describe("userSignedInWithOAuth", () => {
  it("detects apple and google identities", () => {
    expect(
      userSignedInWithOAuth({
        identities: [{ provider: "apple", id: "1" }],
      } as any),
    ).toBe(true);
    expect(
      userSignedInWithOAuth({
        identities: [{ provider: "google", id: "1" }],
      } as any),
    ).toBe(true);
    expect(
      userSignedInWithOAuth({
        identities: [{ provider: "email", id: "1" }],
      } as any),
    ).toBe(false);
  });
});

describe("shouldPromptDisplayNameInOnboarding", () => {
  it("skips display name prompt for oauth users only", () => {
    expect(
      shouldPromptDisplayNameInOnboarding({
        identities: [{ provider: "google", id: "1" }],
      } as any),
    ).toBe(false);
    expect(
      shouldPromptDisplayNameInOnboarding({
        identities: [{ provider: "email", id: "1" }],
      } as any),
    ).toBe(true);
  });
});

describe("displayNameFromAppleFullName", () => {
  it("uses given name only from apple credential", () => {
    expect(
      displayNameFromAppleFullName({
        givenName: "Jan",
        familyName: "Kowalski",
        middleName: null,
        nickname: null,
        namePrefix: null,
        nameSuffix: null,
      }),
    ).toBe("Jan");
  });
});

describe("displayNameFromIdentityData", () => {
  it("uses first name from google identity full_name", () => {
    expect(
      displayNameFromIdentityData({
        identities: [
          {
            provider: "google",
            identity_data: { full_name: "Ada Lovelace" },
          },
        ],
      } as any),
    ).toBe("Ada");
  });

  it("prefers given_name over full_name", () => {
    expect(
      displayNameFromIdentityData({
        identities: [
          {
            provider: "google",
            identity_data: {
              given_name: "Zosia",
              full_name: "Zosia Nowak",
            },
          },
        ],
      } as any),
    ).toBe("Zosia");
  });
});

describe("resolveOAuthUserDisplayName", () => {
  it("falls back to User", () => {
    expect(resolveOAuthUserDisplayName({ user_metadata: {} } as any)).toBe(
      DEFAULT_OAUTH_DISPLAY_NAME,
    );
    expect(
      resolveOAuthUserDisplayName({
        user_metadata: { full_name: "Ada" },
      } as any),
    ).toBe("Ada");
  });
});
