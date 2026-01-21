import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import {
  generateOrGetPublicPage,
  getPublicPageUrl,
} from "../services/publicPages/publicPagesRepo";

type Props = NativeStackScreenProps<AppStackParamList, "Share">;

export function ShareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, title } = route.params;

  const [generating, setGenerating] = useState(false);

  async function handleOnlineReport() {
    try {
      setGenerating(true);
      const publicPage = await generateOrGetPublicPage(vehicleId);
      const url = await getPublicPageUrl(publicPage.public_id);
      navigation.navigate("PublicReportOptions", {
        url,
        vehicleTitle: title,
      });
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("dashboard.tiles.shareTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("dashboard.tiles.shareSubtitle")}
          </Text>
        </View>
      </View>
      <View style={styles.wrap}>
        <Button
          onPress={handleOnlineReport}
          variant="ghost"
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            t("share.onlineReport")
          )}
        </Button>
        <View style={{ height: 10 }} />
        <Button
          onPress={() =>
            navigation.navigate("MarketplacePost", {
              vehicleId: route.params.vehicleId,
              title: route.params.title,
            })
          }
          variant="ghost"
        >
          {t("share.marketplacePost")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
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
      fontSize: 13,
      color: theme.colors.muted,
    },
  });
