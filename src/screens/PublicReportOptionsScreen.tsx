import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastSuccess, toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportOptions">;

export function PublicReportOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { url, vehicleTitle } = route.params;

  async function handleCopyLink() {
    try {
      await Clipboard.setStringAsync(url);
      toastSuccess(t("share.linkCopied"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <Text style={styles.h1}>{t("share.onlineReport")}</Text>
        <Text style={styles.subtitle}>
          {t("share.qrCodeSubtitle")}
        </Text>

        <View style={styles.qrContainer}>
          <View
            style={[
              styles.qrWrapper,
              { 
                backgroundColor: theme.colors.card, 
                borderColor: theme.colors.border,
              },
            ]}
          >
            <QRCode
              value={url}
              size={250}
              color={mode === "dark" ? "#ffffff" : "#000000"}
              backgroundColor={theme.colors.card}
            />
          </View>
        </View>

        <View style={styles.urlContainer}>
          <Text style={[styles.urlText, { color: theme.colors.muted }]} numberOfLines={2}>
            {url}
          </Text>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Button onPress={handleCopyLink} variant="ghost">
          {t("share.copyLink")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      alignItems: "center",
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      marginTop: 8,
      color: theme.colors.muted,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
    },
    qrContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: theme.spacing.xl,
    },
    qrWrapper: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    urlContainer: {
      width: "100%",
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    urlText: {
      fontSize: 12,
      textAlign: "center",
      fontFamily: "monospace",
    },
  });
