import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

import "./sentry";

enableScreens();

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
