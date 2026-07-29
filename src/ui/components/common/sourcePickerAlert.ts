import { Alert, Platform } from "react-native";

import type {
  SourcePickerMenuActionItem,
  SourcePickerMenuItem,
} from "./SourcePickerMenu.types";

function isDividerItem(
  item: SourcePickerMenuItem,
): item is { id: string; type: "divider" } {
  return item.type === "divider";
}

function isActionItem(
  item: SourcePickerMenuItem,
): item is SourcePickerMenuActionItem {
  return !isDividerItem(item);
}

export function openSourcePickerAlert(
  items: SourcePickerMenuItem[],
  cancelLabel = "Cancel",
  title = "",
  message?: string,
): void {
  const actionItems = items.filter(isActionItem);
  if (actionItems.length === 0) return;

  const buttons = actionItems.map((item) => ({
    text: item.label,
    style:
      item.role === "destructive"
        ? ("destructive" as const)
        : ("default" as const),
    onPress: () => {
      if (item.items?.length) {
        openSourcePickerAlert(item.items, cancelLabel, title, message);
        return;
      }
      item.onPress?.();
    },
  }));

  const omitCancel =
    Platform.OS === "android" && actionItems.length >= 3;

  Alert.alert(
    title,
    message,
    omitCancel
      ? buttons
      : [...buttons, { text: cancelLabel, style: "cancel" as const }],
    { cancelable: true },
  );
}
