import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";

type Props = {
  onSelectAll: () => void;
  onReset: () => void;
  selectAllDisabled?: boolean;
  resetDisabled?: boolean;
};

export function ReportOptionsActionsBar({
  onSelectAll,
  onReset,
  selectAllDisabled,
  resetDisabled,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onReset}
        disabled={resetDisabled}
        style={({ pressed }) => [
          styles.button,
          resetDisabled && styles.disabled,
          pressed && !resetDisabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("publicReport.reset")}
      >
        <Text
          style={[
            styles.labelMuted,
            resetDisabled && { color: theme.colors.muted },
          ]}
        >
          {t("publicReport.reset")}
        </Text>
      </Pressable>
      <Pressable
        onPress={onSelectAll}
        disabled={selectAllDisabled}
        style={({ pressed }) => [
          styles.button,
          selectAllDisabled && styles.disabled,
          pressed && !selectAllDisabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("publicReport.selectAll")}
      >
        <Text
          style={[
            styles.labelAccent,
            selectAllDisabled && { color: theme.colors.muted },
          ]}
        >
          {t("publicReport.selectAll")}
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    button: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs / 2,
    },
    labelAccent: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.accent,
    },
    labelMuted: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.7 },
  });
