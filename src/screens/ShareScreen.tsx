import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppNavbar } from "../ui/components/AppNavbar";
import { ContentHeader } from "../ui/components/ContentHeader";
import { AppLayout } from "../ui/components/AppLayout";
import { Tile } from "../ui/components/Tile";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Share">;

export function ShareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const tiles = useMemo(
    () => [
      {
        key: "report",
        title: t("share.onlineReport"),
        icon: "document-text" as const,
        onPress: () => navigation.navigate("PublicReport", { vehicleId }),
      },
      {
        key: "marketplace",
        title: t("share.marketplacePost"),
        icon: "pricetag" as const,
        onPress: () => navigation.navigate("Marketplace", { vehicleId }),
      },
    ],
    [t, navigation, vehicleId],
  );

  return (
    <AppLayout
      header={
        <AppNavbar
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <ContentHeader title={t("dashboard.tiles.shareTitle")} />
      <View style={{ flex: 1 }}>
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
      </View>
    </AppLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
