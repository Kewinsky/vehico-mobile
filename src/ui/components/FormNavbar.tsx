import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../ThemeProvider";
import { hexToRgba } from "./ChoiceChip";

export type FormNavbarProps = {
  onCancel: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
};

export function FormNavbar({
  onCancel,
  onSave,
  canSave,
  saving,
}: FormNavbarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.topBar,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      <Pressable
        onPress={onCancel}
        hitSlop={10}
        style={({ pressed }) => [
          styles.pillButton,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.pillText, { color: theme.colors.fg }]}>
          {t("common.cancel")}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (canSave && !saving) onSave();
        }}
        hitSlop={10}
        style={({ pressed }) => [
          styles.pillButton,
          {
            borderColor: theme.colors.accent,
            backgroundColor: accentBg,
            opacity: !canSave || saving ? 0.5 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.pillText, { color: theme.colors.accent }]}>
          {t("common.done")}
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    topBar: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
    },
    pillButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pillText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
