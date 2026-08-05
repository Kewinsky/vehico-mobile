import { useCallback, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ClipboardCheck } from "lucide-react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type {
  ServiceEntry,
  ServiceEntryCategory,
  Workshop,
} from "../../types/domain";
import type { ServiceHistoryFiltersParams } from "../modal/ServiceHistoryFiltersScreen";
import {
  matchesServiceCategoryFilter,
  type ServiceHistoryCategoryFilter,
} from "../../constants/vehicleTypes";
import {
  deleteServiceEntry,
  listServiceEntries,
} from "../../services/serviceEntries/serviceEntriesRepo";
import { countPendingWorkshopEntries } from "../../services/workshopIntake/workshopIntakeRepo";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { ServiceItem } from "../../ui/components/list/ServiceItem";
import { DashboardCalloutCard } from "../../ui/components/dashboard/DashboardCalloutCard";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { toastCaughtError } from "../../ui/toast/toast";
import { SERVICE_CATEGORY_ICON_BACKGROUND } from "../../ui/theme/serviceCategoryColors";
import { ServiceCategoryIcon } from "../../ui/components/service/ServiceCategoryIcon";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceHistory">;

export function ServiceHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { vehicleId } = route.params;
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [workshopsById, setWorkshopsById] = useState<Record<string, Workshop>>(
    {},
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currency = settings?.currency ?? "PLN";

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ServiceHistoryCategoryFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [sortOption, setSortOption] = useState<
    | "date-newest"
    | "date-oldest"
    | "title-az"
    | "title-za"
    | "cost-asc"
    | "cost-desc"
  >("date-newest");

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const [data, workshops, pending] = await Promise.all([
          listServiceEntries(vehicleId),
          listWorkshops(),
          countPendingWorkshopEntries(vehicleId),
        ]);
        setItems(data);
        const workshopMap = workshops.reduce<Record<string, Workshop>>(
          (acc, workshop) => {
            acc[workshop.id] = workshop;
            return acc;
          },
          {},
        );
        setWorkshopsById(workshopMap);
        setPendingCount(pending);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload<ServiceHistoryFiltersParams>({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
    pendingModalKey: "serviceHistory",
    applyPendingModalResult: (pending) => {
      setCategoryFilter(
        (pending.categoryFilter as ServiceHistoryCategoryFilter) ?? "all",
      );
      setDateFrom(pending.dateFrom ?? "");
      setDateTo(pending.dateTo ?? "");
      setMinCost(pending.minCost ?? "");
      setMaxCost(pending.maxCost ?? "");
      setSortOption(
        (pending.sortOption as
          | "date-newest"
          | "date-oldest"
          | "title-az"
          | "title-za"
          | "cost-asc"
          | "cost-desc") ?? "date-newest",
      );
    },
    deferFocusReload: true,
  });

  const hasActiveFilters = useMemo(() => {
    return (
      categoryFilter !== "all" ||
      dateFrom.trim().length > 0 ||
      dateTo.trim().length > 0 ||
      minCost.trim().length > 0 ||
      maxCost.trim().length > 0
    );
  }, [categoryFilter, dateFrom, dateTo, minCost, maxCost]);

  const openFilters = useCallback(() => {
    navigation.navigate("ServiceHistoryFilters", {
      vehicleId,
      categoryFilter,
      dateFrom,
      dateTo,
      minCost,
      maxCost,
      sortOption,
    });
  }, [
    navigation,
    vehicleId,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
    sortOption,
  ]);

  const resetFilters = useCallback(() => {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setSortOption("date-newest");
  }, []);

  const timelineRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const serviceRows = items
      .filter((e) => {
        const cat = (e.category ?? "other") as ServiceEntryCategory;
        if (!matchesServiceCategoryFilter(cat, categoryFilter)) return false;
        const d = String(e.service_date).slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (min != null) {
          if (e.cost == null) return false;
          if (Number(e.cost) < min) return false;
        }
        if (max != null) {
          if (e.cost == null) return false;
          if (Number(e.cost) > max) return false;
        }
        if (q.length) {
          const hay = `${e.title ?? ""}\n${e.description ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((e) => ({
        kind: "service" as const,
        id: e.id,
        sortKey: String(e.service_date).slice(0, 10),
        sortMileage: e.mileage ?? -1, // Use -1 for entries without mileage
        entry: e,
      }));

    // Sort service rows based on sortOption
    const [sortBy, sortOrder] = sortOption.split("-") as [string, string];
    const sortedServiceRows = [...serviceRows].sort((a, b) => {
      if (sortBy === "date") {
        // Sort by date
        if (a.sortKey === b.sortKey) return 0;
        if (sortOrder === "newest") {
          return a.sortKey < b.sortKey ? 1 : -1;
        } else {
          return a.sortKey > b.sortKey ? 1 : -1;
        }
      }

      if (sortBy === "title") {
        const aTitle = (a.entry.title ?? "").trim();
        const bTitle = (b.entry.title ?? "").trim();
        const cmp = aTitle.localeCompare(bTitle, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return sortOrder === "az" ? cmp : -cmp;
        // Tiebreaker: newest first
        return b.sortKey.localeCompare(a.sortKey);
      }

      // Sort by cost
      const aCost = a.entry.cost == null ? null : Number(a.entry.cost);
      const bCost = b.entry.cost == null ? null : Number(b.entry.cost);
      if (aCost == null && bCost == null) return 0;
      if (aCost == null) return 1;
      if (bCost == null) return -1;
      const diff = aCost - bCost;
      if (diff !== 0) return sortOrder === "asc" ? diff : -diff;
      return b.sortKey.localeCompare(a.sortKey);
    });

    return sortedServiceRows;
  }, [
    items,
    query,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
    sortOption,
  ]);

  const sortByDate = sortOption.startsWith("date");
  const getMonthYearKey = (row: { sortKey: string }) => row.sortKey.slice(0, 7);

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
        onPress: () =>
          navigation.navigate("ServiceEntryForm", {
            vehicleId,
          }),
      },
    ],
    [hasActiveFilters, navigation, openFilters, resetFilters, vehicleId],
  );

  const handleDeleteEntry = useCallback(
    (entry: ServiceEntry) => {
      Alert.alert(t("entryDetail.deleteTitle"), t("entryDetail.deleteBody"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteServiceEntry(entry.id);
              setItems((prev) => prev.filter((item) => item.id !== entry.id));
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ]);
    },
    [t],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
    >
      <View style={{ flex: 1 }}>
        <CustomFlatList<(typeof timelineRows)[number]>
          data={timelineRows}
          listHeaderComponent={
            <>
              <ContentHeader title={t("dashboard.tiles.serviceTitle")} />
              {pendingCount > 0 ? (
                <DashboardCalloutCard
                  accentColor={theme.colors.accent}
                  buttonColor={theme.colors.accent}
                  icon={
                    <ClipboardCheck
                      size={26}
                      color={theme.colors.accent}
                      strokeWidth={2}
                    />
                  }
                  title={t("serviceHistory.pendingBanner", {
                    count: pendingCount,
                  })}
                  actions={[
                    {
                      label: t("pendingWorkshop.title"),
                      onPress: () =>
                        navigation.navigate("PendingWorkshopEntries", {
                          vehicleId,
                        }),
                    },
                  ]}
                />
              ) : null}
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={t("common.search", { defaultValue: "Search" })}
              />
            </>
          }
          groupByMonth={sortByDate}
          getMonthYearKey={getMonthYearKey}
          keyExtractor={(e) => `${e.kind}:${e.id}`}
          renderItem={({ item: rowItem }) => {
            const e = rowItem.entry;
            const cat = (e.category ?? "other") as ServiceEntryCategory;
            const badge =
              e.source === "workshop"
                ? t("serviceHistory.workshopBadge", {
                    name:
                      e.submitted_workshop_name ||
                      (e.workshop_id
                        ? workshopsById[e.workshop_id]?.name
                        : null) ||
                      e.workshop_snapshot ||
                      "",
                  })
                : null;
            return (
              <ServiceItem
                title={e.title}
                icon={<ServiceCategoryIcon category={cat} />}
                iconBackgroundColor={SERVICE_CATEGORY_ICON_BACKGROUND[cat]}
                date={e.service_date}
                mileage={e.mileage}
                badge={badge}
                cost={e.cost}
                currency={currency}
                onPress={() =>
                  navigation.navigate("ServiceEntryForm", {
                    entryId: e.id,
                    vehicleId,
                  })
                }
                onDelete={() => handleDeleteEntry(e)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState body={t("timeline.noServiceEntries")} />
          }
          refreshing={refreshing}
          onRefresh={() => void load({ refreshing: true })}
        />
      </View>
    </HeaderLayout>
  );
}
