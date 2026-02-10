import { StyleSheet, Text, View, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const { canGenerateReport, isPremium } = useEntitlements();

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
    if (!canGenerateReport && !isPremium) {
      Alert.alert(
        t("limits.reportLimitReachedTitle"),
        t("limits.noReportsRemaining"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ]
      );
      return;
    }
    navigation.navigate("PublicReportConfigure", { vehicleId });
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("publicReport.title")}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Button onPress={onGeneratePress}>
          {t("publicReport.generateButton")}
        </Button>
        <View style={{ height: theme.spacing.xs }} />
        <Button
          onPress={() =>
            navigation.navigate("PublicReportHistory", {
              vehicleId,
            })
          }
          variant="ghost"
        >
          {t("publicReport.historyButton")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    content: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    infoHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    infoTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    infoText: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.muted,
    },
  });
