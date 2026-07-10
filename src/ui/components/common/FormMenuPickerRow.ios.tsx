import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { fixedSize, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { CardRow } from "./Card";
import type { FormMenuPickerRowProps } from "./FormMenuPickerRow";

export type { FormMenuPickerRowProps } from "./FormMenuPickerRow";

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
  const valueColor = isValueMuted ? theme.colors.muted : theme.colors.fg;

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={disabled ? styles.disabled : undefined}
    >
      <CardRow
        style={rowStyle ? [styles.cardRow, rowStyle] : styles.cardRow}
        error={error}
      >
        <View style={styles.pickerRow}>
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
          <View style={styles.valueWrap}>
            <Host
              matchContents={{ horizontal: true, vertical: true }}
              colorScheme={themeMode === "dark" ? "dark" : "light"}
              style={styles.nativePickerHost}
            >
              <Picker
                selection={selectedIndex}
                modifiers={[
                  pickerStyle("menu"),
                  fixedSize({ horizontal: true, vertical: true }),
                ]}
                onSelectionChange={(selection) => {
                  onOptionSelected(Number(selection));
                }}
              >
                {options.map((option, index) => (
                  <SwiftUIText key={`${option}-${index}`} modifiers={[tag(index)]}>
                    {option}
                  </SwiftUIText>
                ))}
              </Picker>
            </Host>
          </View>
        </View>
      </CardRow>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    disabled: {
      opacity: 0.55,
    },
    cardRow: {
      paddingRight: 0,
    },
    pickerRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
      maxWidth: "55%",
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      flexShrink: 1,
    },
    valueWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    nativePickerHost: {
      flexShrink: 0,
      maxWidth: "100%",
    },
  });
