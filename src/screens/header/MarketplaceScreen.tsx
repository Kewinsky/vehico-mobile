import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CirclePlus, History } from "lucide-react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onGeneratePress = useCallback(() => {
    if (!isPremium) {
      Alert.alert(
        t("limits.premiumRequiredTitle"),
        t("limits.premiumRequiredBody"),
        getPremiumUpgradeAlertButtons(t, navigation),
      );
      return;
    }
    navigation.navigate("MarketplaceConfigure", { vehicleId });
  }, [isPremium, navigation, t, vehicleId]);

  const tiles = useMemo(
    () => [
      {
        key: "generate",
        title: t("marketplace.generateButton"),
        onPress: onGeneratePress,
      },
      {
        key: "history",
        title: t("marketplace.historyButton"),
        onPress: () =>
          navigation.navigate("MarketplacePostHistory", {
            vehicleId,
          }),
      },
    ],
    [t, navigation, vehicleId, onGeneratePress],
  );

  return (
    <HeaderLayout onBack={() => navigation.goBack()} showProfileAvatar>
      <NativeHeaderScrollView>
        <ContentHeader title={t("marketplace.screenTitle")} />
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
