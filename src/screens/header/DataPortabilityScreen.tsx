import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { routes } from "../../core/navigation/routes";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../core/providers/EntitlementsProvider";

export function DataPortabilityScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const tiles = useMemo(
    () => [
      {
        key: "export",
        title: t("dataPortability.exportButton"),
        icon: "share" as const,
        onPress: () => {
          if (!vehicleId) return;
          router.push(routes.exportData(vehicleId));
        },
      },
      {
        key: "import",
        title: t("dataPortability.importButton"),
        icon: "download" as const,
        onPress: () => {
          if (!vehicleId) return;
          router.push(routes.importData(vehicleId));
        },
      },
    ],
    [t, router, vehicleId],
  );

  return (
    <HeaderContentScreen
      onBack={() => router.back()}
      showShopIcon={!isPremium}
      title={t("dataPortability.title")}
    >
      <View style={styles.row}>
        {tiles.map((item) => (
          <Tile
            key={item.key}
            onPress={item.onPress}
            minHeight={130}
            title={item.title}
            icon={
              <Ionicons
                name={item.icon}
                size={32}
                color={theme.colors.accent}
              />
            }
          />
        ))}
      </View>
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
