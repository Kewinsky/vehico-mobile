import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { routes } from "../../core/navigation/routes";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";

export function ShareScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const tiles = useMemo(
    () => [
      {
        key: "report",
        title: t("share.onlineReport"),
        icon: "globe-outline" as const,
        onPress: () => {
          if (!vehicleId) return;
          router.push(routes.publicReport(vehicleId));
        },
      },
      {
        key: "marketplace",
        title: t("share.marketplacePost"),
        icon: "pricetag" as const,
        onPress: () => {
          if (!vehicleId) return;
          router.push(routes.marketplace(vehicleId));
        },
      },
    ],
    [t, router, vehicleId],
  );

  return (
    <HeaderLayout onBack={() => router.back()} showProfileAvatar>
      <NativeHeaderScrollView>
        <ContentHeader title={t("dashboard.tiles.shareTitle")} />
        <View style={styles.row}>
          {tiles.map((item) => (
            <Tile
              key={item.key}
              title={item.title}
              icon={
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={theme.colors.accent}
                />
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
