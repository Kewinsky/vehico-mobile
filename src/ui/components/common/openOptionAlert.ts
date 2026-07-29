import { Alert } from "react-native";

type OpenOptionAlertParams = {
  title?: string;
  options: readonly string[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  cancelLabel?: string;
};

export function openOptionAlert({
  title,
  options,
  onSelect,
  cancelLabel = "Cancel",
}: OpenOptionAlertParams): void {
  if (options.length === 0) return;

  Alert.alert(
    title ?? "",
    undefined,
    [
      ...options.map((label, index) => ({
        text: label,
        onPress: () => onSelect(index),
      })),
      { text: cancelLabel, style: "cancel" as const },
    ],
    { cancelable: true },
  );
}
