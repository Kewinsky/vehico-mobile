import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";
import { IOSMenuPickerControl } from "./IOSMenuPickerControl";

export type FormMenuPickerRowProps = {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  options: string[];
  selectedIndex: number;
  onOptionSelected: (index: number) => void;
  isValueMuted?: boolean;
  error?: boolean;
  disabled?: boolean;
  rowStyle?: ViewStyle;
};

export function FormMenuPickerRow({
  icon,
  iconComponent,
  label,
  options,
  selectedIndex,
  onOptionSelected,
  isValueMuted = false,
  error = false,
  disabled = false,
  rowStyle,
}: FormMenuPickerRowProps) {
  const { theme, mode: themeMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const displayText = options[selectedIndex] ?? "";
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={disabled ? styles.disabled : undefined}
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
        <IOSMenuPickerControl
          displayText={displayText}
          valueColor={valueColor}
          options={options}
          onSelect={onOptionSelected}
          colorScheme={themeMode === "dark" ? "dark" : "light"}
        />
      </CardRow>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    disabled: {
      opacity: 0.55,
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
      flexShrink: 1,
    },
  });
