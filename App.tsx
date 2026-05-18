import "react-native-gesture-handler";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import * as Sentry from "@sentry/react-native";

import { Root } from "./src/app/Root";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

Sentry.init({
  dsn: "https://bb8a391252f0a1f19332c7fe49ddce03@o4511342291451904.ingest.de.sentry.io/4511342294073424",
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(Root);
