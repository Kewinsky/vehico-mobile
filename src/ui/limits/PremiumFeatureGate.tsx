import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "../components/common/Button";
import { useTheme } from "../ThemeProvider";
import { showPremiumRequiredAlert } from "./entitlementAlerts";

type Navigation = {
  navigate: (screen: "Shop") => void;
};

type PremiumFeatureGateProps = PropsWithChildren<{
  isPremium: boolean;
  navigation: Navigation;
  /** Hide completely on free plan (e.g. smart banners). */
  hideWhenLocked?: boolean;
  minHeight?: number;
}>;

export function PremiumFeatureGate({
  isPremium,
  navigation,
  hideWhenLocked = false,
  minHeight = 168,
  children,
}: PremiumFeatureGateProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (isPremium) {
    return <>{children}</>;
  }

  if (hideWhenLocked) {
    return null;
  }

  return (
    <View
      style={[
        styles.locked,
        {
          minHeight,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Ionicons
        name="lock-closed-outline"
        size={28}
        color={theme.colors.muted}
      />
      <Text style={[styles.body, { color: theme.colors.muted }]}>
        {t("limits.premiumRequiredBody")}
      </Text>
      <Button
        variant="outlined"
        onPress={() => showPremiumRequiredAlert(t, navigation)}
      >
        {t("limits.upgradeToPremium")}
      </Button>
    </View>
  );
}

function makeStyles(theme: {
  spacing: { md: number; sm: number };
  typography: { small: number; fontWeight: { medium: string } };
  radius: { md: number };
}) {
  return StyleSheet.create({
    locked: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    body: {
      fontSize: theme.typography.small,
      textAlign: "center",
      lineHeight: theme.typography.small + 4,
    },
  });
}
