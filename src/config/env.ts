function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Set it in your Expo env (EXPO_PUBLIC_*) before running the app.`
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
    `Invalid EXPO_PUBLIC_APP_ENV: "${raw}". Use "development" or "production".`
  );
}

export const ENV = {
  APP_ENV: getAppEnv(),
  SUPABASE_URL: getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getRequiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
};
