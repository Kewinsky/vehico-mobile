import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { formatDateDisplay } from "../../../utils/dateFormatting";
import { localeCodeFromLanguage } from "../../../utils/numberFormatting";
import { formatYmd, parseYmd } from "../../../utils/dateYmd";
import { CardRow } from "./Card";

export type FormDateRowProps = {
  label: string;
  /** `YYYY-MM-DD` or empty string when optional. */
  value: string;
  onChange: (ymd: string) => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  rowStyle?: ViewStyle;
  trailing?: ReactNode;
  error?: boolean;
};

export function FormDateRow({
  label,
  value,
  onChange,
  icon,
  iconComponent,
  placeholder,
  disabled = false,
  rowStyle,
  trailing,
  error = false,
}: FormDateRowProps) {
  const { theme, mode: themeMode } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const hasValue = value.trim().length === 10;
  const pickerDate = parseYmd(hasValue ? value : formatYmd(new Date()));

  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [iosPickerActive, setIosPickerActive] = useState(false);

  const displayText = hasValue
    ? formatDateDisplay(`${value}T12:00:00`, i18n.language)
    : (placeholder ?? t("common.selectDate"));

  const pickerLocale = localeCodeFromLanguage(i18n.language);

  const showIosCompact =
    Platform.OS === "ios" && !disabled && (hasValue || iosPickerActive);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setAndroidPickerVisible(false);
    }
    if (event.type === "dismissed") {
      if (Platform.OS === "ios" && !hasValue) setIosPickerActive(false);
      return;
    }
    if (!selectedDate) return;
    onChange(formatYmd(selectedDate));
    if (Platform.OS === "ios" && !hasValue) setIosPickerActive(true);
  }

  function openPicker() {
    if (disabled) return;
    if (Platform.OS === "android") {
      setAndroidPickerVisible(true);
      return;
    }
    if (!hasValue) setIosPickerActive(true);
  }

  return (
    <>
      <CardRow style={rowStyle} error={error}>
        <Pressable
          onPress={openPicker}
          disabled={
            disabled || (Platform.OS === "ios" && showIosCompact && hasValue)
          }
          style={({ pressed }) => [
            styles.pressableRow,
            {
              opacity: pressed && !disabled && Platform.OS !== "ios" ? 0.75 : 1,
            },
          ]}
        >
          {(icon || iconComponent) && (
            <View style={styles.rowLeft}>
              {iconComponent ??
                (icon ? (
                  <Ionicons name={icon} size={20} color={theme.colors.accent} />
                ) : null)}
              <Text
                style={[styles.label, { color: theme.colors.muted }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          )}
          {!icon && !iconComponent ? (
            <Text
              style={[
                styles.label,
                { color: theme.colors.muted, flexShrink: 1 },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null}
          <View style={styles.valueWrap}>
            {showIosCompact ? (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="compact"
                locale={pickerLocale}
                accentColor={theme.colors.accent}
                themeVariant={themeMode === "dark" ? "dark" : "light"}
                onChange={handleChange}
                style={styles.nativeDatePicker}
              />
            ) : (
              <Text
                style={[
                  styles.valueText,
                  {
                    color: hasValue ? theme.colors.fg : theme.colors.muted,
                    textAlign: "right",
                  },
                ]}
                numberOfLines={1}
              >
                {displayText}
              </Text>
            )}
          </View>
        </Pressable>
        {trailing}
      </CardRow>

      {Platform.OS === "android" && androidPickerVisible ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          locale={pickerLocale}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    pressableRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    valueWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    nativeDatePicker: {
      flex: 1,
      minWidth: 0,
      alignSelf: "flex-end",
    },
  });
