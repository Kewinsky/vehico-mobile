import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { showPremiumRequiredAlert } from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "Share">;

export function ShareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth =
    (windowWidth -
      theme.layout.contentPaddingHorizontal * 2 -
      theme.spacing.sm) /
    2;

  const tiles = useMemo(
    () => [
      {
        key: "report",
        title: t("share.onlineReport"),
        icon: "globe-outline" as const,
        onPress: () => navigation.navigate("PublicReport", { vehicleId }),
      },
      {
        key: "marketplace",
        title: t("share.marketplacePost"),
        icon: "pricetag" as const,
        onPress: () => navigation.navigate("Marketplace", { vehicleId }),
      },
      {
        key: "workshopIntake",
        title: t("share.workshopIntake"),
        icon: "qr-code" as const,
        onPress: () => {
          if (!isPremium) {
            showPremiumRequiredAlert(t, navigation);
            return;
          }
          navigation.navigate("WorkshopIntake", { vehicleId });
        },
      },
    ],
    [t, navigation, vehicleId, isPremium],
  );

  return (
    <HeaderLayout onBack={() => navigation.goBack()}>
      <NativeHeaderScrollView>
        <ContentHeader title={t("dashboard.tiles.shareTitle")} />
        <View style={styles.row}>
          {tiles.map((item) => (
            <View key={item.key} style={{ width: tileWidth }}>
              <Tile
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
            </View>
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
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
  });
