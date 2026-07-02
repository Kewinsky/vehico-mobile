import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";
import { FormMenuPickerRow } from "./FormMenuPickerRow";
import { buildMenuPickerState } from "./menuPickerState";
import { openAlertPicker } from "./openAlertPicker";

export type FormPickerRowProps<T extends string> = {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T | null) => void;
  placeholderLabel?: string;
  mutedValues?: readonly T[];
  error?: boolean;
  disabled?: boolean;
  rowStyle?: ViewStyle;
};

export function FormPickerRow<T extends string>({
  icon,
  iconComponent,
  label,
  value,
  options,
  getLabel,
  onChange,
  placeholderLabel,
  mutedValues,
  error = false,
  disabled = false,
  rowStyle,
}: FormPickerRowProps<T>) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { pickerOptions, selectedIndex, isValueMuted, handleSelectIndex } =
    useMemo(
      () =>
        buildMenuPickerState({
          value,
          options,
          getLabel,
          placeholderLabel,
          mutedValues,
        }),
      [value, options, getLabel, placeholderLabel, mutedValues],
    );

  const displayText = useMemo(() => {
    if (value === null) return placeholderLabel ?? "";
    return getLabel(value);
  }, [value, getLabel, placeholderLabel]);

  if (Platform.OS === "ios") {
    return (
      <FormMenuPickerRow
        icon={icon}
        iconComponent={iconComponent}
        label={label}
        options={pickerOptions}
        selectedIndex={selectedIndex}
        isValueMuted={isValueMuted}
        onOptionSelected={(index) => {
          onChange(handleSelectIndex(index));
        }}
        error={error}
        disabled={disabled}
        rowStyle={rowStyle}
      />
    );
  }

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        openAlertPicker({
          cancelLabel: t("common.cancel"),
          choices: [
            ...(placeholderLabel
              ? [{ label: placeholderLabel, onPress: () => onChange(null) }]
              : []),
            ...options.map((option) => ({
              label: getLabel(option),
              onPress: () => onChange(option),
            })),
          ],
        });
      }}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.75 : 1 }]}
    >
      <CardRow style={rowStyle} error={error}>
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
        <Text
          style={[
            styles.valueText,
            {
              color: isValueMuted ? theme.colors.muted : theme.colors.fg,
              textAlign: "right",
            },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
      </CardRow>
    </Pressable>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
  });
