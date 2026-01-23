import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../ThemeProvider";

export function AppHeader({
  onBack,
  right,
  title,
}: {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
}) {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const styles = makeStyles(theme);

  // Choose logo based on theme mode
  const logoSource =
    mode === "dark"
      ? require("../../../assets/icon-dark-no-bg.png")
      : require("../../../assets/icon-light-no-bg.png");

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.fg} />
          </Pressable>
        ) : null}
      </View>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.logoContainer}>
          <Image
            source={logoSource}
            style={styles.logo}
            contentFit="contain"
            transition={200}
          />
        </View>
      )}
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      height: 52,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    left: { width: 48, alignItems: "flex-start", justifyContent: "center" },
    right: { width: 48, alignItems: "flex-end", justifyContent: "center" },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
    },
    backButtonPressed: {
      opacity: 0.6,
    },
    title: {
      color: theme.colors.fg,
      fontWeight: "800",
      letterSpacing: 0.2,
      fontSize: 15,
    },
    logoContainer: {
      height: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 100,
      height: 32,
    },
  });
