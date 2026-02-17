import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../ThemeProvider";

type LoadingIndicatorProps = {
  size?: "small" | "large";
};

export function LoadingIndicator({ size = "small" }: LoadingIndicatorProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.accent} />
      <Text style={styles.text}>{t("common.loading")}</Text>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    text: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
    },
  });
