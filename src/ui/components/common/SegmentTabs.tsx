import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "./ChoiceChip";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Array<Option<T>>;
  onChange: (next: T) => void;
  size?: "sm" | "md";
};

export function SegmentTabs<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
      ]}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              {
                borderColor: theme.colors.accent,
                backgroundColor: selected ? accentBg : "transparent",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                size === "sm" ? styles.textSm : styles.textMd,
                { color: selected ? theme.colors.accent : theme.colors.muted },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      alignSelf: "stretch",
      width: "100%",
      minWidth: 0,
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 2,
    },
    tab: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    tabSelected: {
      borderWidth: 1,
    },
    textMd: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    textSm: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
