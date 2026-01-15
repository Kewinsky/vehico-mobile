import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../ThemeProvider";
import { IconButton } from "./IconButton";

export function AppHeader({
  onBack,
  right,
  title,
}: {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = makeStyles(theme);

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <IconButton onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.muted} />
          </IconButton>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title ?? t("common.appName")}
      </Text>
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      height: 52,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    left: { width: 48 },
    right: { width: 48, alignItems: "flex-end", justifyContent: "center" },
    title: {
      color: theme.colors.fg,
      fontWeight: '800',
      letterSpacing: 0.2,
      fontSize: 15,
    },
  });

