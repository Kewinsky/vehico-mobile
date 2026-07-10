import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";
import { routes } from "../../core/navigation/routes";
import type { FuelFiltersParams } from "../modal/FuelFiltersScreen";
import { useScreenFocusReload } from "../../core/useScreenFocusReload";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { listFuelingEntries , deleteFuelingEntry } from "../../services/fuel/fuelingEntriesRepo";
import type { FuelingEntry, GasStation } from "../../types/domain";
import { useUnitDisplay } from "../../core/hooks/useUnitDisplay";
import { useUserSettings } from "../../core/providers/UserSettingsProvider";
import { toastError } from "../../ui/toast/toast";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { FuelItem } from "../../ui/components/list/FuelItem";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { Alert } from "react-native";

export function FuelScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
  const router = useRouter();
  const { t } = useTranslation();
  const { settings } = useUserSettings();

  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stationFilter, setStationFilter] = useState<GasStation | null>(null);
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const currency = settings?.currency ?? "PLN";
  const { fuelUnitShort: fuelUnitLabel } = useUnitDisplay();

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      if (!vehicleId) return;
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const f = await listFuelingEntries(vehicleId);
        setFueling(f);
      } catch (err: any) {
        toastError(err?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload<FuelFiltersParams>({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
    pendingModalKey: "fuel",
    applyPendingModalResult: (pending) => {
      setDateFrom(pending.dateFrom ?? "");
      setDateTo(pending.dateTo ?? "");
      setStationFilter((pending.stationFilter as GasStation) ?? null);
      setMinCost(pending.minCost ?? "");
      setMaxCost(pending.maxCost ?? "");
    },
  });

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
    if (!vehicleId) return;
    router.push(
      routes.fuelFilters(vehicleId, {
        dateFrom,
        dateTo,
        stationFilter,
        minCost,
        maxCost,
      }),
    );
  }, [router, vehicleId, dateFrom, dateTo, stationFilter, minCost, maxCost]);

  const resetFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setStationFilter(null);
    setMinCost("");
    setMaxCost("");
  }, []);

  const openAddEntry = useCallback(() => {
    if (!vehicleId) return;
    router.push(routes.fuelingEntryForm(vehicleId));
  }, [router, vehicleId]);

  const filteredFuelingList = useMemo(() => {
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const filtered = fueling.filter((f) => {
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
  }, [fueling, dateFrom, dateTo, stationFilter, minCost, maxCost]);

  const getMonthYearKey = (entry: FuelingEntry) =>
    String(entry.date).slice(0, 7);

  const headerActions: HeaderAction[] = useMemo(() => {
    const actions: HeaderAction[] = [];
    if (hasActiveFilters) {
      actions.push({
        type: "filterReset",
        onPress: resetFilters,
      });
    }
    actions.push(
      {
        type: "filter",
        onPress: openFilters,
        hasActive: hasActiveFilters,
      },
      {
        type: "add",
        onPress: openAddEntry,
      },
    );
    return actions;
  }, [hasActiveFilters, openFilters, openAddEntry, resetFilters]);

  const handleDeleteFueling = useCallback(
    (entry: FuelingEntry) => {
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
                await deleteFuelingEntry(entry.id);
                setFueling((prev) => prev.filter((item) => item.id !== entry.id));
              } catch (e: any) {
                toastError(e?.message ?? t("common.error"));
              }
            },
          },
        ],
      );
    },
    [t],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => router.back()}
      actions={headerActions}
    >
      <CustomFlatList<FuelingEntry>
        data={filteredFuelingList}
        listHeaderComponent={
          <>
            <ContentHeader title={t("dashboard.tiles.fuelTitle")} />
          </>
        }
        groupByMonth
        getMonthYearKey={getMonthYearKey}
        keyExtractor={(item) => item.id}
        renderItem={({ item: entry }) => (
          <FuelItem
            date={String(entry.date).slice(0, 10)}
            fuelTypeLabel={
              entry.fuel_type
                ? t(`fuelingForm.fuelTypes.${entry.fuel_type}`)
                : null
            }
            stationLabel={
              entry.gas_station
                ? t(`fuelingForm.stations.${entry.gas_station}`)
                : null
            }
            amount={Number(entry.fuel_amount)}
            fuelUnitLabel={fuelUnitLabel}
            cost={Number(entry.fuel_cost)}
            currency={currency}
            onPress={() => {
              if (!vehicleId) return;
              router.push(routes.fuelingEntryForm(vehicleId, entry.id));
            }}
            onDelete={() => handleDeleteFueling(entry)}
          />
        )}
        ListEmptyComponent={<EmptyState body={t("fuelCosts.noFueling")} />}
      />
    </HeaderLayout>
  );
}
