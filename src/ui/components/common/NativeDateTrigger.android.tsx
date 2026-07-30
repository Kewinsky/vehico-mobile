import { useState } from "react";
import { StyleSheet, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

import { localeCodeFromLanguage } from "../../../utils/numberFormatting";
import { formatYmd, parseYmd } from "../../../utils/dateYmd";
import type { NativeDateTriggerProps } from "./NativeDateTrigger.types";

export type { NativeDateTriggerProps } from "./NativeDateTrigger.types";

export function NativeDateTrigger({
  value,
  onChange,
  disabled = false,
  style,
  children,
  onDismiss,
}: NativeDateTriggerProps) {
  const { i18n } = useTranslation();
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);

  const hasValue = value.trim().length === 10;
  const pickerDate = parseYmd(hasValue ? value : formatYmd(new Date()));
  const locale = localeCodeFromLanguage(i18n.language);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setAndroidPickerVisible(false);
    if (event.type === "dismissed") {
      onDismiss?.();
      return;
    }
    if (!selectedDate) return;
    onChange(formatYmd(selectedDate));
  }

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View
      style={[style, styles.fill]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={() => setAndroidPickerVisible(true)}
      accessibilityRole="button"
    >
      {children}
      {androidPickerVisible ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          locale={locale}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignSelf: "stretch",
  },
});
