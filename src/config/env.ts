function trimOrEmpty(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length ? v : undefined;
}

type AppEnv = "development" | "production";

function getAppEnv(): AppEnv {
  const raw = trimOrEmpty(process.env.EXPO_PUBLIC_APP_ENV) ?? "development";
  return raw === "production" ? "production" : "development";
}

const appEnv = getAppEnv();
const revenuecatIosKey = trimOrEmpty(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);
const revenuecatAndroidKey = trimOrEmpty(
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
);
if (appEnv === "production" && !revenuecatIosKey && !revenuecatAndroidKey) {
  throw new Error(
    "Missing RevenueCat API key. Set EXPO_PUBLIC_REVENUECAT_API_KEY (iOS) and/or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY for production builds.",
  );
}

const webAppUrl =
  trimOrEmpty(process.env.EXPO_PUBLIC_REPORTS_APP_URL) ??
  "https://vehico.vercel.app";
const supportEmail =
  trimOrEmpty(process.env.EXPO_PUBLIC_SUPPORT_EMAIL) ?? "support@vericar.pl";

const supabaseUrl = trimOrEmpty(process.env.EXPO_PUBLIC_SUPABASE_URL);
if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable EXPO_PUBLIC_SUPABASE_URL. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.",
  );
}

const supabaseAnonKey = trimOrEmpty(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable EXPO_PUBLIC_SUPABASE_ANON_KEY. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.",
  );
}

const reportsAppUrl = trimOrEmpty(process.env.EXPO_PUBLIC_REPORTS_APP_URL);
if (!reportsAppUrl) {
  throw new Error(
    "Missing environment variable EXPO_PUBLIC_REPORTS_APP_URL. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.",
  );
}

const turnstileSiteKey = trimOrEmpty(
  process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY,
);

export const ENV = {
  APP_ENV: appEnv,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  REPORTS_APP_URL: reportsAppUrl,
  REVENUECAT_API_KEY: revenuecatIosKey,
  REVENUECAT_ANDROID_API_KEY: revenuecatAndroidKey ?? revenuecatIosKey,
  WEB_APP_URL: webAppUrl,
  SUPPORT_EMAIL: supportEmail,
  /** Public Turnstile site key. Secret stays only in Supabase dashboard. */
  TURNSTILE_SITE_KEY: turnstileSiteKey,
} as const;
