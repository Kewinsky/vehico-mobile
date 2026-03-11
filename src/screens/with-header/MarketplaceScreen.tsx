import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/Button";
import { ContentHeader } from "../../ui/components/ContentHeader";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();

  function onGeneratePress() {
    if (!isPremium) {
      Alert.alert(
        t("limits.premiumRequiredTitle"),
        t("limits.premiumRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("MarketplaceConfigure", { vehicleId });
  }

  return (
    <HeaderLayout
      onBack={() => navigation.goBack()}
      showProfileAvatar
    >
      <ContentHeader title={t("marketplace.screenTitle")} />
      <View style={{ flex: 1 }}>
        <Button onPress={onGeneratePress}>
          {t("marketplace.generateButton")}
        </Button>
        <View style={{ height: theme.spacing.sm }} />
        <Button
          onPress={() =>
            navigation.navigate("MarketplacePostHistory", {
              vehicleId,
            })
          }
          variant="ghost"
        >
          {t("marketplace.historyButton")}
        </Button>
      </View>
    </HeaderLayout>
  );
}
