import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleTire, VehicleWheel } from "../types/domain";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../services/tires/tiresRepo";
import {
  listVehicleWheels,
  formatWheelDimensions,
} from "../services/wheels/wheelsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Wheels">;

export function WheelsOverviewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [tiresData, wheelsData] = await Promise.all([
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
        ]);
        setTires(tiresData);
        setWheels(wheelsData);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t]
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
    return unsub;
  }, [navigation, load]);

  const currentTire = tires.find((x) => x.is_currently_fitted) ?? null;
  const currentWheel = wheels.find((x) => x.is_currently_fitted) ?? null;

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <View
          style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("wheels.title")}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View
        style={[
          styles.fixedHeader,
          {
            backgroundColor: theme.colors.bg,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("wheels.title")}</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
          {t("wheels.currentlyFitted")}
        </Text>
        <View
          style={[
            styles.card,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View style={styles.currentRow}>
            <Ionicons
              name="ellipse-outline"
              size={20}
              color={theme.colors.muted}
            />
            <View style={styles.currentRowText}>
              <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>
                {t("wheels.tiresSection")}
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  { color: currentTire ? theme.colors.fg : theme.colors.muted },
                ]}
                numberOfLines={1}
              >
                {currentTire
                  ? `${currentTire.name} · ${formatTireDimensions(
                      currentTire.width_mm,
                      currentTire.aspect_ratio,
                      currentTire.diameter_inch
                    )}`
                  : t("wheels.noTires")}
              </Text>
            </View>
          </View>
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
          <View style={styles.currentRow}>
            <Ionicons
              name="disc-outline"
              size={20}
              color={theme.colors.muted}
            />
            <View style={styles.currentRowText}>
              <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>
                {t("wheels.rimsSection")}
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  {
                    color: currentWheel ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
                numberOfLines={1}
              >
                {currentWheel
                  ? `${currentWheel.name} · ${formatWheelDimensions(
                      currentWheel.width_inch,
                      currentWheel.diameter_inch
                    )}`
                  : t("wheels.noWheels")}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => navigation.navigate("TiresList", { vehicleId })}
            style={({ pressed }) => [
              styles.tile,
              pressed && styles.tilePressed,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Ionicons
              name="ellipse-outline"
              size={32}
              color={theme.colors.accent}
            />
            <Text style={styles.tileTitle}>{t("wheels.tiresSection")}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("WheelsList", { vehicleId })}
            style={({ pressed }) => [
              styles.tile,
              pressed && styles.tilePressed,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Ionicons
              name="disc-outline"
              size={32}
              color={theme.colors.accent}
            />
            <Text style={styles.tileTitle}>{t("wheels.rimsSection")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      borderBottomWidth: 1,
    },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.titleMarginBottom,
    },
    container: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    card: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      overflow: "hidden",
    },
    cardLabel: {
      fontSize: theme.typography.small,
    },
    cardValue: {
      marginTop: 2,
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    currentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    currentRowText: { flex: 1, minWidth: 0 },
    divider: { height: 1, width: "100%" },
    buttonsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    tile: {
      flex: 1,
      minHeight: 110,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      fontWeight: "800",
      textAlign: "center",
    },
  });
}
