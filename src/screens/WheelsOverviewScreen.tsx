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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [tiresData, wheelsData] = await Promise.all([
        listVehicleTires(vehicleId),
        listVehicleWheels(vehicleId),
      ]);
      setTires(tiresData);
      setWheels(wheelsData);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const currentTire = tires.find((x) => x.is_currently_fitted) ?? null;
  const currentWheel = wheels.find((x) => x.is_currently_fitted) ?? null;

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <LoadingIndicator />
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("wheels.title")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t("dashboard.tiles.wheelsSubtitle")}
        </Text>

        <View style={{ height: theme.spacing.lg }} />

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
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>
              {t("wheels.tiresSection")}
            </Text>
            {currentTire ? (
              <Text style={{ color: theme.colors.fg, fontWeight: "600" }}>
                {currentTire.name} –{" "}
                {formatTireDimensions(
                  currentTire.width_mm,
                  currentTire.aspect_ratio,
                  currentTire.diameter_inch,
                )}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted }}>
                {t("wheels.noTires")}
              </Text>
            )}
          </View>
          <View style={[styles.cardRow, { marginTop: theme.spacing.sm }]}>
            <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>
              {t("wheels.rimsSection")}
            </Text>
            {currentWheel ? (
              <Text style={{ color: theme.colors.fg, fontWeight: "600" }}>
                {currentWheel.name} –{" "}
                {formatWheelDimensions(
                  currentWheel.width_inch,
                  currentWheel.diameter_inch,
                )}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted }}>
                {t("wheels.noWheels")}
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: theme.spacing.xl }} />

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => navigation.navigate("TiresList", { vehicleId })}
            style={({ pressed }) => [
              styles.actionCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name="ellipse-outline"
              size={32}
              color={theme.colors.accent}
            />
            <Text style={[styles.actionTitle, { color: theme.colors.fg }]}>
              {t("wheels.tiresSection")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("WheelsList", { vehicleId })}
            style={({ pressed }) => [
              styles.actionCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name="disc-outline"
              size={32}
              color={theme.colors.accent}
            />
            <Text style={[styles.actionTitle, { color: theme.colors.fg }]}>
              {t("wheels.rimsSection")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    card: {
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    cardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    cardLabel: {
      fontSize: theme.typography.small,
    },
    buttonsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    actionCard: {
      flex: 1,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      padding: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      minHeight: theme.spacing.xl * 4 - 8,
    },
    actionTitle: {
      fontSize: theme.typography.small,
      fontWeight: "600",
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
  });
}
