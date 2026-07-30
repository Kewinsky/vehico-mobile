import { Alert, type AlertButton } from "react-native";

export function promptAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: "default" | "plain-text" | "secure-text" | "login-password",
  defaultValue?: string,
  keyboardType?: string,
): void {
  Alert.prompt(title, message, buttons, type, defaultValue, keyboardType);
}
