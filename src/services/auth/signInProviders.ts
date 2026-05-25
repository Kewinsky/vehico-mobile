import type { User } from "@supabase/supabase-js";
import type { AppleAuthenticationFullName } from "expo-apple-authentication";

import { normalizeDisplayName } from "../../utils/displayName";
import { supabase } from "../supabase/client";

export const DEFAULT_OAUTH_DISPLAY_NAME = "User";

const OAUTH_PROVIDERS = new Set(["apple", "google"]);

export function userSignedInWithOAuth(
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  return (user.identities ?? []).some((identity) =>
    OAUTH_PROVIDERS.has(identity.provider),
  );
}

/** Email OTP users choose a display name during onboarding. */
export function shouldPromptDisplayNameInOnboarding(
  user: User | null | undefined,
): boolean {
  return !userSignedInWithOAuth(user);
}

function displayNameFromGivenName(
  givenName: string | null | undefined,
): string | null {
  const normalized = normalizeDisplayName(givenName);
  return normalized.length >= 2 ? normalized : null;
}

/** First token when provider only exposes a full name (e.g. Google). */
function displayNameFromFullNameValue(
  fullName: string | null | undefined,
): string | null {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return displayNameFromGivenName(first);
}

export function displayNameFromAppleFullName(
  fullName: AppleAuthenticationFullName | null,
): string | null {
  if (!fullName) return null;
  return displayNameFromGivenName(fullName.givenName);
}

/** Success toast only for users who already finished onboarding. */
export function shouldShowSignedInSuccessToast(
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return metadata.has_completed_onboarding === true;
}

export async function shouldShowSignedInSuccessToastForCurrentUser(): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return shouldShowSignedInSuccessToast(user);
}

function readMetadataDisplayName(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const meta = metadata ?? {};

  const fromGiven = displayNameFromGivenName(
    typeof meta.given_name === "string" ? meta.given_name : undefined,
  );
  if (fromGiven) return fromGiven;

  const nameCandidates = [
    meta.full_name,
    meta.name,
    meta.user_name,
    meta.preferred_username,
  ];

  for (const value of nameCandidates) {
    const fromFirst = displayNameFromFullNameValue(
      typeof value === "string" ? value : undefined,
    );
    if (fromFirst) return fromFirst;
  }

  return null;
}

export function displayNameFromIdentityData(
  user: User | null | undefined,
): string | null {
  if (!user) return null;

  for (const identity of user.identities ?? []) {
    if (!OAUTH_PROVIDERS.has(identity.provider)) continue;

    const data = identity.identity_data as Record<string, unknown> | undefined;
    const fromData = readMetadataDisplayName(data);
    if (fromData) return fromData;
  }

  return null;
}

export function resolveOAuthUserDisplayName(
  user: User | null | undefined,
): string {
  const fromMetadata = readMetadataDisplayName(
    user?.user_metadata as Record<string, unknown> | undefined,
  );
  if (fromMetadata) return fromMetadata;

  const fromIdentity = displayNameFromIdentityData(user);
  if (fromIdentity) return fromIdentity;

  return DEFAULT_OAUTH_DISPLAY_NAME;
}

/** Store OAuth display name before onboarding (Apple/Google). */
export async function persistOAuthDisplayName(options?: {
  appleFullName?: AppleAuthenticationFullName | null;
}): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return;

  const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (existing.has_completed_onboarding === true) return;

  const displayName =
    displayNameFromAppleFullName(options?.appleFullName ?? null) ??
    readMetadataDisplayName(existing) ??
    displayNameFromIdentityData(user) ??
    DEFAULT_OAUTH_DISPLAY_NAME;

  const { error } = await supabase.auth.updateUser({
    data: {
      ...existing,
      full_name: displayName,
      name: displayName,
    },
  });
  if (error) throw error;

  await supabase.auth.refreshSession();
}
