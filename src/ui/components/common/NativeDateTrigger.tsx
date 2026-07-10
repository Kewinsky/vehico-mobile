import type { ReactNode } from "react";
import { useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { localeCodeFromLanguage } from "../../../utils/numberFormatting";
import { formatYmd, parseYmd } from "../../../utils/dateYmd";

type Props = {
  /** `YYYY-MM-DD` or empty string when optional. */
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  onLongPress?: () => void;
  onDismiss?: () => void;
};

/**
 * Custom label/tile is shown instead of the native compact pill; tap near the
 * label opens the same iOS date popover.
 */
export function NativeDateTrigger({
  value,
  onChange,
  disabled = false,
  style,
  children,
  onDismiss,
}: Props) {
  const { mode: themeMode } = useTheme();
  const { i18n } = useTranslation();
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  const hasValue = value.trim().length === 10;
  const pickerDate = parseYmd(hasValue ? value : formatYmd(new Date()));
  const locale = localeCodeFromLanguage(i18n.language);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
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
      style={[style, styles.fill, styles.wrap]}
      onLayout={(event) => setLayout(event.nativeEvent.layout)}
      accessibilityRole="button"
    >
      <View style={styles.visual} pointerEvents="none">
        {children}
      </View>
      {layout ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="compact"
          locale={locale}
          themeVariant={themeMode === "dark" ? "dark" : "light"}
          onChange={handleChange}
          style={[
            styles.hiddenPicker,
            { width: layout.width, height: layout.height },
          ]}
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
  wrap: {
    position: "relative",
  },
  visual: {
    flex: 1,
    width: "100%",
  },
  hiddenPicker: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0.02,
  },
});
