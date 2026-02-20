function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.`,
    );
  }
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length ? value : undefined;
}

type AppEnv = "development" | "production";

function getAppEnv(): AppEnv {
  const raw = getOptionalEnv("EXPO_PUBLIC_APP_ENV") ?? "development";
  if (raw === "development" || raw === "production") return raw;
  throw new Error(
    `Invalid EXPO_PUBLIC_APP_ENV: "${raw}". Use "development" or "production".`,
  );
}

const appEnv = getAppEnv();
const revenucatKey = getOptionalEnv("EXPO_PUBLIC_REVENUECAT_API_KEY");
if (appEnv === "production" && !revenucatKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Set it for production builds."
  );
}

/** Base URL of the public Next.js web app (terms, privacy pages). */
const webAppUrl =
  getOptionalEnv("EXPO_PUBLIC_WEB_APP_URL") ?? "https://vehico.app";

export const ENV = {
  APP_ENV: appEnv,
  SUPABASE_URL: getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getRequiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  REPORTS_APP_URL: getRequiredEnv("EXPO_PUBLIC_REPORTS_APP_URL"),
  REVENUECAT_API_KEY: revenucatKey,
  WEB_APP_URL: webAppUrl,
};
