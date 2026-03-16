import {
  Linking,
  Platform,
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
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError } from "../../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportOptions">;

export function PublicReportOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { isPremium } = useEntitlements();
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
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function handleShare() {
    try {
      await Share.share(Platform.OS === "ios" ? { url } : { message: url });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  const layoutTitle =
    reportTitle != null && reportTitle !== ""
      ? t("publicReport.reportWithTitle", { title: reportTitle })
      : t("share.onlineReport");

  return (
    <HeaderLayout onBack={handleBack} showProfileAvatar>
      <NativeHeaderScrollView>
        <View
          style={{
            paddingBottom: theme.spacing.xl,
          }}
        >
          <ContentHeader title={layoutTitle} subtitle={generatedAt} />
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
                size={qrSize}
                color={mode === "dark" ? "#ffffff" : "#000000"}
                backgroundColor={theme.colors.card}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Button onPress={handleOpenInBrowser}>
              {t("share.openInBrowser")}
            </Button>
            <Button onPress={handleShare} variant="outlined">
              {t("share.title")}
            </Button>
          </View>
        </View>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    qrContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    qrWrapper: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.md,
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
