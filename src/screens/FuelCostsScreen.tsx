import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import {
  listFuelingEntries,
  deleteFuelingEntry,
} from "../services/fuel/fuelingEntriesRepo";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FuelingEntry } from "../types/domain";
import { Button } from "../ui/components/Button";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "FuelCosts">;

export function FuelCostsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const f = await listFuelingEntries(route.params.vehicleId);
      setFueling(f);
    } catch (err: any) {
      toastError(t("common.error"), err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [route.params.vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const totals = useMemo(() => {
    const fuel = fueling.reduce((sum, x) => sum + Number(x.fuel_cost ?? 0), 0);
    return { fuel };
  }, [fueling]);

  function confirmDeleteFueling(id: string) {
    Alert.alert(
      t("fuelCosts.deleteFuelingTitle"),
      t("fuelCosts.deleteFuelingBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFuelingEntry(id);
              setFueling((prev) => prev.filter((x) => x.id !== id));
            } catch (err: any) {
              toastError(t("common.error"), err?.message ?? String(err));
            }
          },
        },
      ]
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.lg,
        }}
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("fuelCosts.title")}
        </Text>

        <View
          style={[
            styles.box,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text style={[styles.muted, { color: theme.colors.muted }]}>
            {t("fuelCosts.totalFuel")}
          </Text>
          <Text style={[styles.value, { color: theme.colors.fg }]}>
            {totals.fuel.toFixed(2)} {currency}
          </Text>
        </View>

        <View style={{ height: 18 }} />
        <Button
          onPress={() =>
            navigation.navigate("FuelingEntryForm", {
              vehicleId: route.params.vehicleId,
            })
          }
        >
          {t("fuelCosts.addFueling")}
        </Button>

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: theme.colors.fg }]}>
          {t("fuelCosts.fuelingSection")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        <FlatList
          data={fueling}
          keyExtractor={(x) => x.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
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
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    navigation.navigate("FuelingEntryForm", {
                      vehicleId: route.params.vehicleId,
                      entryId: item.id,
                    })
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {item.date}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                    {Number(item.distance).toFixed(1)} {distanceUnit} ·{" "}
                    {Number(item.fuel_amount).toFixed(1)} {fuelUnit} ·{" "}
                    {Number(item.fuel_cost).toFixed(2)} {currency}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteFueling(item.id)}
                  hitSlop={10}
                  style={styles.trash}
                >
                  <Text
                    style={{ color: theme.colors.danger, fontWeight: "900" }}
                  >
                    🗑
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("fuelCosts.noFueling")}
              </Text>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800" },
  body: { marginTop: 8, lineHeight: 22 },
  section: { marginTop: 10, fontSize: 16, fontWeight: "800" },
  box: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  muted: { fontWeight: "700" },
  value: { fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trash: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
