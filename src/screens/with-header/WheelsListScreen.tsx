import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleWheel } from "../../types/domain";
import type { WheelsListFiltersParams } from "../modal/WheelsListFiltersScreen";
import { getAndClearPendingModalResult } from "../../app/pendingModalResult";
import {
  listVehicleWheels,
  formatWheelDimensions,
} from "../../services/wheels/wheelsRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/ContentHeader";
import { SearchBar } from "../../ui/components";
import { EmptyState } from "../../ui/components/EmptyState";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/CustomFlatList";
import { TimelineItem } from "../../ui/components/TimelineItem";

type Props = NativeStackScreenProps<AppStackParamList, "WheelsList">;

function wheelSubtitle(
  wheel: VehicleWheel,
  t: (key: string) => string,
): string {
  const dims = formatWheelDimensions(wheel.width_inch, wheel.diameter_inch);
  const parts: string[] = [dims];
  if (wheel.et_offset != null) parts.push(`ET${wheel.et_offset}`);
  if (wheel.bolt_pattern?.trim()) parts.push(wheel.bolt_pattern.trim());
  if (wheel.center_bore_mm != null) {
    const abbr = t("wheels.centerBoreAbbr");
    parts.push(`${abbr} ${wheel.center_bore_mm}mm`);
  }
  if (wheel.bolt_type?.trim()) parts.push(wheel.bolt_type.trim());
  if (wheel.weight_kg != null) parts.push(`${wheel.weight_kg} kg`);
  return parts.join(" · ");
}

export function WheelsListScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId } = route.params;
  const {
    isPremium,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanWheelId,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const wheelOptions = useMemo(
    () =>
      isPremium
        ? undefined
        : freePlanVehicleId === vehicleId
          ? { freePlanWheelId: freePlanWheelId ?? null }
          : { limit: wheelsPerVehicleLimit },
    [
      isPremium,
      vehicleId,
      freePlanVehicleId,
      freePlanWheelId,
      wheelsPerVehicleLimit,
    ],
  );

  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [fittedFilter, setFittedFilter] = useState<
    "all" | "fitted" | "not_fitted"
  >("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleWheels(vehicleId, wheelOptions);
        setWheels(data);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as any).message)
            : t("common.error");
        toastError(message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t, wheelOptions],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => {
      const pending = getAndClearPendingModalResult<WheelsListFiltersParams>(
        "wheelsList",
      );
      if (pending) {
        setFittedFilter(pending.fittedFilter ?? "all");
        setSortOrder(pending.sortOrder ?? "az");
      }
      void refreshEntitlements().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
    return unsub;
  }, [navigation, load, refreshEntitlements]);

  const hasActiveFilters = fittedFilter !== "all" || sortOrder !== "az";

  const filteredWheels = useMemo(() => {
    let list = wheels;
    const q = query.trim().toLowerCase();
    if (q.length) {
      list = list.filter((wheel) =>
        (wheel.name ?? "").toLowerCase().includes(q),
      );
    }
    if (fittedFilter === "fitted") {
      list = list.filter((w) => w.is_currently_fitted);
    } else if (fittedFilter === "not_fitted") {
      list = list.filter((w) => !w.is_currently_fitted);
    }
    const sorted = [...list].sort((a, b) => {
      const cmp = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
      return sortOrder === "az" ? cmp : -cmp;
    });
    return sorted;
  }, [wheels, query, fittedFilter, sortOrder]);

  function onAddWheelPress() {
    if (!isPremium && wheels.length >= wheelsPerVehicleLimit) {
      Alert.alert(
        t("limits.wheelLimitReachedTitle"),
        t("limits.wheelLimitReachedBody", { limit: wheelsPerVehicleLimit }),
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
    navigation.navigate("WheelForm", { vehicleId });
  }

  const openFilters = useCallback(() => {
    navigation.navigate("WheelsListFilters", {
      vehicleId,
      fittedFilter,
      sortOrder,
    });
  }, [navigation, vehicleId, fittedFilter, sortOrder]);

  const headerRight = useMemo(
    () => (
      <View style={styles.headerRight}>
        <HeaderButton
          onPress={openFilters}
          tintColor={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
        >
          <Ionicons
            name="filter-outline"
            size={22}
            color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
          />
        </HeaderButton>
        <HeaderButton
          onPress={onAddWheelPress}
          tintColor={theme.colors.fg}
        >
          <Ionicons name="add" size={24} color={theme.colors.fg} />
        </HeaderButton>
      </View>
    ),
    [
      openFilters,
      onAddWheelPress,
      hasActiveFilters,
      theme.colors.accent,
      theme.colors.fg,
      styles.headerRight,
    ],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      right={headerRight}
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          data={filteredWheels}
          listHeaderComponent={
            <>
              <ContentHeader title={t("wheels.rimsSection")} />
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t("common.search", { defaultValue: "Search" })}
              />
            </>
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TimelineItem
              title={item.name}
              subtitle={wheelSubtitle(item, t)}
              badge={
                item.is_currently_fitted
                  ? t("wheels.currentlyFitted")
                  : undefined
              }
              badgeVariant="accent"
              onPress={() =>
                navigation.navigate("WheelForm", {
                  vehicleId,
                  wheelId: item.id,
                })
              }
            />
          )}
          ListEmptyComponent={<EmptyState body={t("wheels.noWheels")} />}
        />
      </View>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    listWrap: { flex: 1 },
    list: { flex: 1 },
    listContent: { paddingBottom: insets.bottom },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
  });
