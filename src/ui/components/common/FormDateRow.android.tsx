import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import type { FormDateRowProps } from "./FormDateRow.types";

export type { FormDateRowProps } from "./FormDateRow.types";

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
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const hasValue = value.trim().length === 10;
  const pickerDate = parseYmd(hasValue ? value : formatYmd(new Date()));
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);

  const displayText = hasValue
    ? formatDateDisplay(`${value}T12:00:00`, i18n.language)
    : (placeholder ?? t("common.selectDate"));

  const pickerLocale = localeCodeFromLanguage(i18n.language);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setAndroidPickerVisible(false);
    if (event.type === "dismissed") return;
    if (!selectedDate) return;
    onChange(formatYmd(selectedDate));
  }

  function openPicker() {
    if (disabled) return;
    setAndroidPickerVisible(true);
  }

  return (
    <CardRow style={rowStyle} error={error}>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={styles.pressableRow}
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
        </View>
      </Pressable>
      {trailing}
      {androidPickerVisible ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          locale={pickerLocale}
          onChange={handleChange}
        />
      ) : null}
    </CardRow>
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
  });
