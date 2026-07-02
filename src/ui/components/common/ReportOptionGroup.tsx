import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";

type Props = {
  title: string;
  masterChecked: boolean;
  masterDisabled?: boolean;
  onMasterToggle: () => void;
  children: ReactNode;
};

export function ReportOptionGroup({
  title,
  masterChecked,
  masterDisabled,
  onMasterToggle,
  children,
}: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.group}>
      <Pressable
        style={[styles.masterRow, masterDisabled && styles.masterRowDisabled]}
        onPress={() => !masterDisabled && onMasterToggle()}
        disabled={masterDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: masterChecked,
          disabled: !!masterDisabled,
        }}
      >
        <Text
          style={[
            styles.masterTitle,
            masterDisabled && { color: theme.colors.muted },
          ]}
        >
          {title}
        </Text>
        <Ionicons
          name={masterChecked ? "checkbox" : "checkbox-outline"}
          size={24}
          color={
            masterDisabled
              ? theme.colors.muted
              : masterChecked
                ? theme.colors.accent
                : theme.colors.muted
          }
        />
      </Pressable>
      <View style={styles.items}>{children}</View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    group: {
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
    },
    masterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    masterRowDisabled: { opacity: 0.7 },
    masterTitle: {
      flex: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    items: {
      paddingTop: theme.spacing.xs / 2,
    },
  });
