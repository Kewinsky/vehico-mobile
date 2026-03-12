import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { FuelFiltersParams } from "../modal/FuelFiltersScreen";
import { getAndClearPendingModalResult } from "../../app/pendingModalResult";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { useTheme } from "../../ui/ThemeProvider";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import type { FuelingEntry, GasStation } from "../../types/domain";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { toastError } from "../../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { TimelineItem } from "../../ui/components/list/TimelineItem";
import { HeaderButton } from "@react-navigation/elements";

type Props = NativeStackScreenProps<AppStackParamList, "Fuel">;

export function FuelScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stationFilter, setStationFilter] = useState<GasStation | null>(null);
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const currency = settings?.currency ?? "PLN";
  const distanceUnit = settings?.distanceUnit ?? "km";
  const fuelUnit = settings?.fuelUnit ?? "liters";
  const fuelUnitLabel =
    fuelUnit === "liters"
      ? t("dashboard.stats.units.liters")
      : t("dashboard.stats.units.gallons");

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const f = await listFuelingEntries(route.params.vehicleId);
        setFueling(f);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [route.params.vehicleId, t],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => {
      const pending = getAndClearPendingModalResult<FuelFiltersParams>("fuel");
      if (pending) {
        setDateFrom(pending.dateFrom ?? "");
        setDateTo(pending.dateTo ?? "");
        setStationFilter((pending.stationFilter as GasStation) ?? null);
        setMinCost(pending.minCost ?? "");
        setMaxCost(pending.maxCost ?? "");
      }
      void load({ showLoading: false });
    });
    return unsub;
  }, [navigation, load]);

  const hasActiveFilters = useMemo(() => {
    return (
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      stationFilter != null ||
      minCost.trim().length > 0 ||
      maxCost.trim().length > 0
    );
  }, [dateFrom, dateTo, stationFilter, minCost, maxCost]);

  const openFilters = useCallback(() => {
    navigation.navigate("FuelFilters", {
      vehicleId: route.params.vehicleId,
      dateFrom,
      dateTo,
      stationFilter,
      minCost,
      maxCost,
    });
  }, [
    navigation,
    route.params.vehicleId,
    dateFrom,
    dateTo,
    stationFilter,
    minCost,
    maxCost,
  ]);

  const resetFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setStationFilter(null);
    setMinCost("");
    setMaxCost("");
  }, []);

  const openAddEntry = useCallback(() => {
    navigation.navigate("FuelingEntryForm", {
      vehicleId: route.params.vehicleId,
    });
  }, [navigation, route.params.vehicleId]);

  const filteredFuelingList = useMemo(() => {
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const filtered = fueling.filter((f) => {
      const q = query.trim().toLowerCase();
      if (q.length) {
        const stationLabel = f.gas_station
          ? t(`fuelingForm.stations.${f.gas_station}`).toLowerCase()
          : "";
        const fuelTypeLabel = f.fuel_type
          ? t(`fuelingForm.fuelTypes.${f.fuel_type}`).toLowerCase()
          : "";
        const hay = `${String(f.date).slice(
          0,
          10,
        )}\n${stationLabel}\n${fuelTypeLabel}\n${f.fuel_cost ?? ""}\n${
          f.fuel_amount ?? ""
        }\n${f.distance ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const d = String(f.date).slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (stationFilter != null) {
        if (f.gas_station !== stationFilter) return false;
      }
      if (min != null) {
        const cost = Number(f.fuel_cost ?? 0);
        if (cost < min) return false;
      }
      if (max != null) {
        const cost = Number(f.fuel_cost ?? 0);
        if (cost > max) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const dateA = String(a.date).slice(0, 10);
      const dateB = String(b.date).slice(0, 10);
      return dateB.localeCompare(dateA);
    });
    return sorted;
  }, [fueling, query, dateFrom, dateTo, stationFilter, minCost, maxCost, t]);

  const getMonthYearKey = (entry: FuelingEntry) =>
    String(entry.date).slice(0, 7);

  const headerRight = useMemo(
    () => (
      <View style={styles.headerRight}>
        {hasActiveFilters && (
          <HeaderButton
            onPress={resetFilters}
            tintColor={theme.colors.accent}
            accessibilityLabel={t("common.clearButton")}
          >
            <Ionicons
              name="sync-outline"
              size={theme.icons.headerButton}
              color={theme.colors.accent}
            />
          </HeaderButton>
        )}
        <HeaderButton onPress={openFilters} tintColor={theme.colors.accent}>
          <Ionicons
            name="options-outline"
            size={theme.icons.headerButton}
            color={theme.colors.accent}
          />
        </HeaderButton>
        <HeaderButton onPress={openAddEntry} tintColor={theme.colors.accent}>
          <Ionicons
            name="add"
            size={theme.icons.headerButton}
            color={theme.colors.accent}
          />
        </HeaderButton>
      </View>
    ),
    [
      openFilters,
      openAddEntry,
      resetFilters,
      hasActiveFilters,
      theme.colors.accent,
      theme.icons.headerButton,
      styles.headerRight,
      t,
    ],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      right={headerRight}
    >
      <CustomFlatList<FuelingEntry>
        data={filteredFuelingList}
        listHeaderComponent={
          <>
            <ContentHeader title={t("dashboard.tiles.fuelTitle")} />
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.search", { defaultValue: "Search" })}
            />
          </>
        }
        groupByMonth
        getMonthYearKey={getMonthYearKey}
        keyExtractor={(item) => item.id}
        renderItem={({ item: entry }) => (
          <TimelineItem
            title={`${entry.date}${
              entry.fuel_type
                ? ` · ${t(`fuelingForm.fuelTypes.${entry.fuel_type}`)}`
                : ""
            }${
              entry.gas_station
                ? ` · ${t(`fuelingForm.stations.${entry.gas_station}`)}`
                : ""
            }`}
            subtitle={`${Number(entry.distance).toFixed(1)} ${distanceUnit} · ${Number(entry.fuel_amount).toFixed(1)} ${fuelUnitLabel} · ${Number(entry.fuel_cost).toFixed(2)} ${currency}`}
            onPress={() =>
              navigation.navigate("FuelingEntryForm", {
                vehicleId: route.params.vehicleId,
                entryId: entry.id,
              })
            }
          />
        )}
        ListEmptyComponent={<EmptyState body={t("fuelCosts.noFueling")} />}
      />
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
  });
