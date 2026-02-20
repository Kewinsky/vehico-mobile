import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";

import { useTheme } from "../ThemeProvider";

type Props = {
  termsUrl: string;
  privacyUrl: string;
};

export function LegalLinksRow({ termsUrl, privacyUrl }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.legalRow}>
      <Pressable
        onPress={() => void WebBrowser.openBrowserAsync(termsUrl)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.legalLink,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.legalText, { color: theme.colors.muted }]}>
          {t("terms.title")}
        </Text>
      </Pressable>
      <Text style={[styles.legalText, { color: theme.colors.muted }]}>·</Text>
      <Pressable
        onPress={() => void WebBrowser.openBrowserAsync(privacyUrl)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.legalLink,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.legalText, { color: theme.colors.muted }]}>
          {t("privacy.title")}
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    legalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    legalText: {
      fontSize: theme.typography.small,
    },
    legalLink: {
      paddingVertical: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.xs / 2,
    },
  });
