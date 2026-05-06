function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.`,
    );
  }
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length ? value : undefined;
}

type AppEnv = "development" | "production";

function getAppEnv(): AppEnv {
  const raw = getOptionalEnv("EXPO_PUBLIC_APP_ENV") ?? "development";
  return raw === "production" ? "production" : "development";
}

const appEnv = getAppEnv();
const revenuecatKey = getOptionalEnv("EXPO_PUBLIC_REVENUECAT_API_KEY");
if (appEnv === "production" && !revenuecatKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Set it for production builds.",
  );
}

/** Base URL of the public Next.js web app (terms, privacy pages). */
const webAppUrl =
  getOptionalEnv("EXPO_PUBLIC_REPORTS_APP_URL") ?? "https://vehico.app";
const supportEmail = getOptionalEnv("EXPO_PUBLIC_SUPPORT_EMAIL") ?? "support@vehico.pl";

export const ENV = {
  APP_ENV: appEnv,
  SUPABASE_URL: getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getRequiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  REPORTS_APP_URL: getRequiredEnv("EXPO_PUBLIC_REPORTS_APP_URL"),
  REVENUECAT_API_KEY: revenuecatKey,
  WEB_APP_URL: webAppUrl,
  SUPPORT_EMAIL: supportEmail,
} as const;
