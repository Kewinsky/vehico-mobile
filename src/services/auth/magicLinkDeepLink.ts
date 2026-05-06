/**
 * Parses Supabase magic-link redirect URLs for error signals (fragment or query).
 */
export function parseMagicLinkError(url: string): null | "expired" {
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.substring(hashIndex + 1) : "";
  const queryIndex = url.indexOf("?");
  const query = queryIndex >= 0 ? url.substring(queryIndex + 1) : "";
  const params = new URLSearchParams(fragment || query);

  const error = params.get("error") ?? "";
  const errorCode = params.get("error_code") ?? "";
  const errorDesc = params.get("error_description") ?? "";
  const haystack = `${error} ${errorCode} ${errorDesc}`.toLowerCase().trim();

  if (!haystack) return null;
  if (haystack.includes("expired")) return "expired";
  if (haystack.includes("invalid") && haystack.includes("token")) return "expired";
  return "expired";
}
