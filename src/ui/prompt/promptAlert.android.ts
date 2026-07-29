import type { AlertButton } from "react-native";

import { showTextPrompt } from "./promptStore";

export function promptAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: "default" | "plain-text" | "secure-text" | "login-password",
  defaultValue?: string,
  keyboardType?: string,
): void {
  showTextPrompt({
    title,
    message,
    buttons,
    defaultValue,
    keyboardType,
    secureTextEntry: type === "secure-text" || type === "login-password",
  });
}
