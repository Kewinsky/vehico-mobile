import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://bb8a391252f0a1f19332c7fe49ddce03@o4511342291451904.ingest.de.sentry.io/4511342294073424",
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  sendDefaultPii: true,
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],
});
