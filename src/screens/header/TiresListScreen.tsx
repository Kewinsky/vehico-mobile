import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleTire, TireType } from "../../types/domain";
import type { TiresListFiltersParams } from "../modal/TiresListFiltersScreen";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../../services/tires/tiresRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { TiresItem } from "../../ui/components/list/TiresItem";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";

type Props = NativeStackScreenProps<AppStackParamList, "TiresList">;

function tireSubtitle(tire: VehicleTire, t: (key: string) => string): string {
  const dims = formatTireDimensions(
    tire.width_mm,
    tire.aspect_ratio,
    tire.diameter_inch,
  );
  const typeLabel = t(`tireForm.types.${tire.tire_type}`);
  const parts = [dims, typeLabel];
  if (tire.dot?.trim()) parts.push(`DOT ${tire.dot.trim()}`);
  return parts.join(" · ");
}

export function TiresListScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId } = route.params;
  const {
    isPremium,
    tiresPerVehicleLimit,
    freePlanVehicleId,
    freePlanTireId,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const tireOptions = useMemo(
    () =>
      isPremium
        ? undefined
        : freePlanVehicleId === vehicleId
          ? { freePlanTireId: freePlanTireId ?? null }
          : { limit: tiresPerVehicleLimit },
    [
      isPremium,
      vehicleId,
      freePlanVehicleId,
      freePlanTireId,
      tiresPerVehicleLimit,
    ],
  );

  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tireTypeFilter, setTireTypeFilter] = useState<TireType | "all">("all");
  const [fittedFilter, setFittedFilter] = useState<
    "all" | "fitted" | "not_fitted"
  >("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleTires(vehicleId, tireOptions);
        setTires(data);
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
    [vehicleId, t, tireOptions],
  );

  useScreenFocusReload<TiresListFiltersParams>({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    pendingModalKey: "tiresList",
    applyPendingModalResult: (pending) => {
      setTireTypeFilter((pending.tireTypeFilter as TireType | "all") ?? "all");
      setFittedFilter(pending.fittedFilter ?? "all");
      setSortOrder(pending.sortOrder ?? "az");
    },
    deferFocusReload: true,
  });

  const hasActiveFilters =
    tireTypeFilter !== "all" || fittedFilter !== "all" || sortOrder !== "az";

  const filteredTires = useMemo(() => {
    let list = tires;
    const q = query.trim().toLowerCase();
    if (q.length) {
      list = list.filter(
        (tire) =>
          (tire.name ?? "").toLowerCase().includes(q) ||
          (tire.dot ?? "").toLowerCase().includes(q),
      );
    }
    if (tireTypeFilter !== "all") {
      list = list.filter((tire) => tire.tire_type === tireTypeFilter);
    }
    if (fittedFilter === "fitted") {
      list = list.filter((tire) => tire.is_currently_fitted);
    } else if (fittedFilter === "not_fitted") {
      list = list.filter((tire) => !tire.is_currently_fitted);
    }
    const sorted = [...list].sort((a, b) => {
      const cmp = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
      return sortOrder === "az" ? cmp : -cmp;
    });
    return sorted;
  }, [tires, query, tireTypeFilter, fittedFilter, sortOrder]);

  function onAddTirePress() {
    if (!isPremium && tires.length >= tiresPerVehicleLimit) {
      Alert.alert(
        t("limits.tireLimitReachedTitle"),
        t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
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
    navigation.navigate("TireForm", { vehicleId });
  }

  const openFilters = useCallback(() => {
    navigation.navigate("TiresListFilters", {
      vehicleId,
      tireTypeFilter,
      fittedFilter,
      sortOrder,
    });
  }, [navigation, vehicleId, tireTypeFilter, fittedFilter, sortOrder]);

  const resetFilters = useCallback(() => {
    setTireTypeFilter("all");
    setFittedFilter("all");
    setSortOrder("az");
  }, []);

  const headerActions: HeaderAction[] = useMemo(
    () => [
      ...(hasActiveFilters
        ? [
            {
              type: "filterReset",
              onPress: resetFilters,
            } as HeaderAction,
          ]
        : []),
      {
        type: "filter",
        onPress: openFilters,
        hasActive: hasActiveFilters,
      },
      {
        type: "add",
        onPress: onAddTirePress,
      },
    ],
    [hasActiveFilters, onAddTirePress, openFilters, resetFilters],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          data={filteredTires}
          listHeaderComponent={
            <>
              <ContentHeader title={t("wheels.tiresSection")} />
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t("common.search", { defaultValue: "Search" })}
              />
            </>
          }
          keyExtractor={(item: VehicleTire) => item.id}
          renderItem={({ item }) => (
            <TiresItem
              title={item.name}
              subtitle={tireSubtitle(item, t)}
              badge={
                item.is_currently_fitted
                  ? t("wheels.currentlyFitted")
                  : undefined
              }
              badgeVariant="accent"
              onPress={() =>
                navigation.navigate("TireForm", { vehicleId, tireId: item.id })
              }
            />
          )}
          ListEmptyComponent={<EmptyState body={t("wheels.noTires")} />}
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
