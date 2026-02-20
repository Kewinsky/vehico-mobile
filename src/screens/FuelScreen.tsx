import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppNavbar } from "../ui/components/AppNavbar";
import { ContentHeader } from "../ui/components/ContentHeader";
import { useTheme } from "../ui/ThemeProvider";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { useCallback, useEffect, useState } from "react";
import type { FuelingEntry, GasStation } from "../types/domain";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

const GAS_STATION_OPTIONS: readonly GasStation[] = [
  "orlen",
  "bp",
  "shell",
  "circle_k",
  "mol",
  "moya",
  "other",
];

type Props = NativeStackScreenProps<AppStackParamList, "Fuel">;

import { CustomFlatList } from "../ui/components/CustomFlatList";
import { AppLayout } from "../ui/components/AppLayout";
import { EmptyState } from "../ui/components/EmptyState";
import { TimelineItem } from "../ui/components/TimelineItem";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Use local time to avoid UTC date shifting.
  return new Date(year, month - 1, day);
}

export function FuelScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const [fueling, setFueling] = useState<FuelingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
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
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
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

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStationFilter(null);
    setMinCost("");
    setMaxCost("");
  }

  function openPicker(kind: "from" | "to") {
    const current = kind === "from" ? dateFrom : dateTo;
    setDatePickerDraft(
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date())),
    );
    setOpenDatePicker(kind);
  }

  function cancelPicker() {
    setOpenDatePicker(null);
  }

  function confirmPicker() {
    if (!openDatePicker) return;
    const ymd = formatYmd(datePickerDraft);
    if (openDatePicker === "from") setDateFrom(ymd);
    if (openDatePicker === "to") setDateTo(ymd);
    setOpenDatePicker(null);
  }

  function renderInlineDatePicker() {
    return (
      <View
        style={[
          styles.pickerWrap,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <DateTimePicker
          value={datePickerDraft}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={
            Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
              ? "dark"
              : "light"
          }
          onChange={(event, selectedDate) => {
            if (Platform.OS === "ios") {
              if (selectedDate) setDatePickerDraft(selectedDate);
              return;
            }

            setOpenDatePicker(null);
            if ((event as any)?.type === "dismissed") return;
            if (!selectedDate) return;
            const ymd = formatYmd(selectedDate);
            if (openDatePicker === "from") setDateFrom(ymd);
            if (openDatePicker === "to") setDateTo(ymd);
          }}
        />
        {Platform.OS === "ios" ? (
          <View style={styles.pickerActionsRow}>
            <Pressable
              onPress={cancelPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.pickerActionText, { color: theme.colors.muted }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: accentBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerActionText,
                  { color: theme.colors.accent },
                ]}
              >
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function showStationPicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setStationFilter(null) },
      ...GAS_STATION_OPTIONS.map((s) => ({
        text: t(`fuelingForm.stations.${s}`),
        onPress: () => setStationFilter(s),
      })),
    ];
    Alert.alert(t("timeline.filterStation"), "", buttons, { cancelable: true });
  }

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

    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => {
      const dateA = String(a.date).slice(0, 10);
      const dateB = String(b.date).slice(0, 10);
      return dateB.localeCompare(dateA);
    });
    return sorted;
  }, [fueling, query, dateFrom, dateTo, stationFilter, minCost, maxCost, t]);

  const getMonthYearKey = (entry: FuelingEntry) =>
    String(entry.date).slice(0, 7);

  const filterPanelContent = (
    <>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBarWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.muted}
            style={styles.searchBarIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("fuelCosts.searchPlaceholder")}
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            style={[styles.searchBarInput, { color: theme.colors.fg }]}
          />
        </View>
        <View style={styles.panelButtonsRow}>
          <View
            style={[
              styles.filterButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() =>
                navigation.navigate("FuelingEntryForm", {
                  vehicleId: route.params.vehicleId,
                })
              }
              style={({ pressed }) => [
                styles.filterButtonInner,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="add" size={24} color={theme.colors.fg} />
            </Pressable>
          </View>

          <View
            style={[
              styles.filterButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
              hasActiveFilters && {
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <Pressable
              onPress={() => setFiltersOpen((v) => !v)}
              style={({ pressed }) => [
                styles.filterButtonInner,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name="filter-outline"
                size={24}
                color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
              />
            </Pressable>
          </View>
          {hasActiveFilters ? (
            <View
              style={[
                styles.filterButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Pressable
                onPress={resetFilters}
                style={({ pressed }) => [
                  styles.filterButtonInner,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={24}
                  color={theme.colors.fg}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {filtersOpen ? (
        <>
          <View style={{ height: theme.spacing.sm }} />
          <View
            style={[
              styles.filtersCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={showStationPicker}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color:
                      stationFilter != null
                        ? theme.colors.fg
                        : theme.colors.muted,
                  },
                ]}
              >
                {stationFilter != null
                  ? t(`fuelingForm.stations.${stationFilter}`)
                  : t("timeline.filterStation")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.accent}
              />
            </Pressable>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <Pressable
              onPress={() => openPicker("from")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color: dateFrom ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
              >
                {dateFrom || t("timeline.filterFrom")}
              </Text>
            </Pressable>
            {openDatePicker === "from" ? (
              <>
                {renderInlineDatePicker()}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}

            <Pressable
              onPress={() => openPicker("to")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color: dateTo ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
              >
                {dateTo || t("timeline.filterTo")}
              </Text>
            </Pressable>
            {openDatePicker === "to" ? (
              <>
                {renderInlineDatePicker()}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}

            <View style={styles.row}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.accent}
              />
              <TextInput
                value={minCost}
                onChangeText={setMinCost}
                keyboardType="decimal-pad"
                placeholder={`${t("timeline.filterMinCost")} (${currency})`}
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, { color: theme.colors.fg }]}
              />
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.accent}
              />
              <TextInput
                value={maxCost}
                onChangeText={setMaxCost}
                keyboardType="decimal-pad"
                placeholder={`${t("timeline.filterMaxCost")} (${currency})`}
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, { color: theme.colors.fg }]}
              />
            </View>
          </View>
        </>
      ) : null}
    </>
  );

  return (
    <AppLayout
      loading={loading}
      header={
        <AppNavbar
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <CustomFlatList<FuelingEntry>
        data={filteredFuelingList}
        listHeaderComponent={
          <ContentHeader
            title={t("dashboard.tiles.fuelTitle")}
            filterPanel={filterPanelContent}
          />
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
    </AppLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    panelButtonsRow: {
      marginLeft: theme.spacing.xs,
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    emptyText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.small,
    },
    body: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 6,
    },
    section: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cardMeta: {
      fontSize: theme.typography.small,
    },
    searchRow: { flexDirection: "row", alignItems: "center" },
    searchBarWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      height: theme.spacing.lg * 2,
      paddingLeft: theme.spacing.sm,
    },
    searchBarIcon: {
      marginRight: theme.spacing.xs,
    },
    searchBarInput: {
      flex: 1,
      height: "100%",
      paddingVertical: 0,
      fontSize: theme.typography.body,
    },
    filterButton: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    filterButtonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    filtersRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    filtersAction: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.sm,
      alignSelf: "flex-start",
    },
    filtersCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    divider: { height: 1, width: "100%" },
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    loadingContainer: {
      flex: 1,
      minHeight: 200,
      paddingTop: theme.spacing.lg * 2.5,
      paddingBottom: theme.spacing.lg * 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
  });
