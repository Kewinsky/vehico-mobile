import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Marketplace">;

export function MarketplaceScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const { canGenerateListing, isPremium } = useEntitlements();

  const load = useCallback(async () => {
    try {
      const v = await getVehicle(vehicleId);
      setVehicle(v);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  function onGeneratePress() {
    if (!canGenerateListing && !isPremium) {
      Alert.alert(
        t("limits.listingLimitReachedTitle"),
        t("limits.noListingsRemaining"),
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
    <Screen padding={false} header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={styles.fixedHeader}>
        <Text style={styles.h1}>{t("marketplace.screenTitle")}</Text>
      </View>
      <View style={styles.content}>
        <Button onPress={onGeneratePress}>
          {t("marketplace.generateButton")}
        </Button>
        <View style={{ height: theme.spacing.xs }} />
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
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },

    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    content: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
  });
