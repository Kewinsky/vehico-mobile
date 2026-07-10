import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CirclePlus, History } from "lucide-react-native";
import { routes } from "../../core/navigation/routes";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../core/providers/EntitlementsProvider";
import { usePremiumNavigation } from "../../core/hooks/usePremiumNavigation";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Tile } from "../../ui/components/common/Tile";
import { showPremiumRequiredAlert } from "../../ui/limits/entitlementAlerts";

export function PublicReportScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const premiumNavigation = usePremiumNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onGeneratePress = useCallback(() => {
    if (!vehicleId) return;
    if (!isPremium) {
      showPremiumRequiredAlert(t, premiumNavigation);
      return;
    }
    router.push(routes.publicReportConfigure(vehicleId));
  }, [isPremium, premiumNavigation, router, t, vehicleId]);

  const tiles = useMemo(
    () => [
      {
        key: "generate",
        title: t("publicReport.generateButton"),
        onPress: onGeneratePress,
      },
      {
        key: "history",
        title: t("publicReport.historyButton"),
        onPress: () => {
          if (!vehicleId) return;
          router.push(routes.publicReportHistory(vehicleId));
        },
      },
    ],
    [t, router, vehicleId, onGeneratePress],
  );

  return (
    <HeaderLayout onBack={() => router.back()} showProfileAvatar>
      <NativeHeaderScrollView>
        <ContentHeader title={t("publicReport.title")} />
        <View style={styles.row}>
          {tiles.map((item) => (
            <Tile
              key={item.key}
              title={item.title}
              icon={
                item.key === "generate" ? (
                  <CirclePlus size={32} color={theme.colors.accent} />
                ) : (
                  <History size={32} color={theme.colors.accent} />
                )
              }
              onPress={item.onPress}
              minHeight={130}
            />
          ))}
        </View>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
