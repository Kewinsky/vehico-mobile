import {
  Linking,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import { Logo } from "../../ui/components/branding/Logo";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportOptions">;

export function PublicReportOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { url, vehicleId, reportTitle, generatedAt } = route.params;
  const { width } = useWindowDimensions();

  const qrSize = useMemo(() => {
    const max = 260;
    const min = 180;
    const available =
      width -
      theme.layout.contentPaddingHorizontal * 2 -
      theme.spacing.md * 2 -
      2;
    return Math.max(min, Math.min(max, Math.floor(available)));
  }, [width, theme.layout.contentPaddingHorizontal, theme.spacing.md]);

  const qrLogoSize = useMemo(
    () => Math.round(Math.min(40, Math.max(28, qrSize * 0.15))),
    [qrSize],
  );

  const handleBack = () => {
    // Try to go back first, if not possible, replace with PublicReport screen
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("PublicReport", { vehicleId });
    }
  };

  async function handleOpenInBrowser() {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        toastError(t("share.cannotOpenUrl"));
      }
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  async function handleShare() {
    try {
      await Share.share({ url });
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  const layoutTitle =
    reportTitle != null && reportTitle !== ""
      ? t("publicReport.reportWithTitle", { title: reportTitle })
      : t("share.onlineReport");

  const footer = (
    <View style={styles.actions}>
      <Button onPress={handleOpenInBrowser}>{t("share.openInBrowser")}</Button>
      <Button onPress={handleShare} variant="outlined">
        {t("share.title")}
      </Button>
    </View>
  );

  return (
    <HeaderLayout onBack={handleBack} footer={footer}>
      <NativeHeaderScrollView contentContainerStyle={styles.scrollContent}>
        <ContentHeader title={layoutTitle} subtitle={generatedAt} />
        <View style={styles.qrCenterWrap}>
          <View style={[styles.qrInner, { width: qrSize, height: qrSize }]}>
            <QRCode
              value={url}
              size={qrSize}
              color={mode === "dark" ? "#ffffff" : "#000000"}
              backgroundColor={theme.colors.bg}
              ecl="H"
            />
            <View
              style={styles.qrLogoOverlay}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={[styles.qrLogoBadge]}>
                <Logo width={qrLogoSize} height={qrLogoSize} />
              </View>
            </View>
          </View>
        </View>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
    },
    qrCenterWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: theme.spacing.md,
    },
    qrInner: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    qrLogoOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    qrLogoBadge: {
      backgroundColor: theme.mode === "dark" ? "#FFFFFF" : "#000000",

      borderRadius: 999,
      padding: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    url: {
      flex: 1,
      fontSize: theme.typography.small,
      color: theme.colors.fg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pressed: {
      opacity: 0.9,
    },
    actions: {
      gap: theme.spacing.sm,
    },
  });
