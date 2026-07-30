import { Platform } from "react-native";

const IOS_MIN_VERSION = 17;

/** `@expo/ui/swift-ui` is iOS 17+ only; Android must use React Native fallbacks. */
export function supportsExpoSwiftUI(): boolean {
  return (
    Platform.OS === "ios" &&
    Number.parseFloat(String(Platform.Version)) >= IOS_MIN_VERSION
  );
}
