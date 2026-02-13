import {
  StyleSheet,
  Text,
  View,
  Linking,
  ScrollView,
  Share,
  useWindowDimensions,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportOptions">;

export function PublicReportOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { url, vehicleId, reportTitle } = route.params;
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

  return (
    <Screen padding={false} header={
        <AppHeader
          onBack={handleBack}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }>
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>
            {reportTitle
              ? t("publicReport.reportWithTitle", { title: reportTitle })
              : t("share.onlineReport")}
          </Text>
        </View>

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
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    lead: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.muted,
    },
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    qrContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    qrWrapper: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    url: {
      flex: 1,
      fontSize: theme.typography.small,
      color: theme.colors.fg,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.9,
    },
    actions: {
      gap: theme.spacing.sm,
    },
  });
