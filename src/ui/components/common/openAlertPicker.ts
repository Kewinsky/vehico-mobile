import { Alert } from "react-native";

export function openAlertPicker(opts: {
  title?: string;
  cancelLabel: string;
  choices: { label: string; onPress: () => void }[];
}) {
  Alert.alert(
    opts.title ?? "",
    "",
    [
      { text: opts.cancelLabel, style: "cancel" },
      ...opts.choices.map((choice) => ({
        text: choice.label,
        onPress: choice.onPress,
      })),
    ],
    { cancelable: true },
  );
}
