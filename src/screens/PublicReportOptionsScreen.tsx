import { StyleSheet, Text, View, Linking } from "react-native";
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
  const { url, vehicleTitle, vehicleId, reportTitle } = route.params;

  const handleBack = () => {
    // Try to go back first, if not possible, replace with PublicReport screen
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("PublicReport", { vehicleId });
    }
  };

  async function handleCopyLink() {
    try {
      await Clipboard.setStringAsync(url);
      toastSuccess(t("share.linkCopied"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function handleOpenInBrowser() {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        toastError(t("share.cannotOpenUrl"));
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={handleBack} />
      <View style={styles.wrap}>
        <Text style={styles.h1}>
          {reportTitle
            ? t("publicReport.reportWithTitle", { title: reportTitle })
            : t("share.onlineReport")}
        </Text>
        <Text style={styles.subtitle}>{t("share.qrCodeSubtitle")}</Text>

        <View style={{ height: 16 }} />

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

        <View style={{ height: 16 }} />

        <Button onPress={handleCopyLink} variant="ghost">
          {t("share.copyLink")}
        </Button>

        <View style={{ height: 10 }} />

        <Button onPress={handleOpenInBrowser} variant="ghost">
          {t("share.openInBrowser")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      color: theme.colors.muted,
      lineHeight: 22,
    },
    qrContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    qrWrapper: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
