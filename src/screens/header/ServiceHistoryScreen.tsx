import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n/i18n";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type {
  Reminder,
  ServiceEntry,
  ServiceEntryCategory,
  TimelineItem as TimelineRow,
} from "../../types/domain";
import type { ServiceHistoryFiltersParams } from "../modal/ServiceHistoryFiltersScreen";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { listReminders } from "../../services/reminders/remindersRepo";
import { listVehicleAttachments } from "../../services/attachments/attachmentsRepo";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { TimelineItem } from "../../ui/components/list/TimelineItem";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { toastError } from "../../ui/toast/toast";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SERVICE_CATEGORY_COLORS,
  SERVICE_CATEGORY_ICON_BACKGROUND,
} from "../../ui/theme/serviceCategoryColors";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { formatDateDisplay } from "../../utils/dateFormatting";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";

type Props = NativeStackScreenProps<AppStackParamList, "ServiceHistory">;

export function ServiceHistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [attachmentsCount, setAttachmentsCount] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const currency = settings?.currency ?? "PLN";

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | ServiceEntryCategory
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [showReminders, setShowReminders] = useState(false);
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
        const reminderOpts = isPremium
          ? undefined
          : freePlanVehicleId === vehicleId
            ? { freePlanReminderIds }
            : { limit: remindersLimit };
        const [data, rs, attachments] = await Promise.all([
          listServiceEntries(vehicleId),
          listReminders(vehicleId, reminderOpts),
          listVehicleAttachments(vehicleId),
        ]);
        setItems(data);
        setReminders(rs);

        // Count attachments per service entry
        const countMap: Record<string, number> = {};
        for (const entry of data) {
          const entryAttachments = attachments.filter(
            (att) => att.service_entry_id === entry.id,
          );
          countMap[entry.id] = entryAttachments.length;
        }
        setAttachmentsCount(countMap);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [
      vehicleId,
      t,
      isPremium,
      remindersLimit,
      freePlanVehicleId,
      freePlanReminderIds,
    ],
  );

  useScreenFocusReload<ServiceHistoryFiltersParams>({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    pendingModalKey: "serviceHistory",
    applyPendingModalResult: (pending) => {
      setCategoryFilter(
        (pending.categoryFilter as "all" | ServiceEntryCategory) ?? "all",
      );
      setDateFrom(pending.dateFrom ?? "");
      setDateTo(pending.dateTo ?? "");
      setMinCost(pending.minCost ?? "");
      setMaxCost(pending.maxCost ?? "");
      setShowReminders(pending.showReminders ?? false);
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
      maxCost.trim().length > 0 ||
      showReminders
    );
  }, [categoryFilter, dateFrom, dateTo, minCost, maxCost, showReminders]);

  const openFilters = useCallback(() => {
    navigation.navigate("ServiceHistoryFilters", {
      vehicleId,
      categoryFilter,
      dateFrom,
      dateTo,
      minCost,
      maxCost,
      showReminders,
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
    showReminders,
    sortOption,
  ]);

  const resetFilters = useCallback(() => {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setShowReminders(false);
    setSortOption("date-newest");
  }, []);

  const renderServiceIcon = useCallback(
    (cat: ServiceEntryCategory) => {
      const color = SERVICE_CATEGORY_COLORS[cat];
      switch (cat) {
        case "maintenance":
          return (
            <MaterialCommunityIcons name="tools" size={22} color={color} />
          );
        case "repair":
          return (
            <MaterialCommunityIcons
              name="wrench-outline"
              size={22}
              color={color}
            />
          );
        case "inspection":
          return <Ionicons name="search-outline" size={22} color={color} />;
        case "upgrade":
          return (
            <Ionicons name="trending-up-outline" size={22} color={color} />
          );
        case "oil_change":
          return <MaterialCommunityIcons name="oil" size={22} color={color} />;
        case "other":
        default:
          return (
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={color}
            />
          );
      }
    },
    [theme.colors.muted],
  );

  const timelineRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minCost.trim().length ? Number(minCost) : null;
    const max = maxCost.trim().length ? Number(maxCost) : null;
    const from = dateFrom.trim().length === 10 ? dateFrom.trim() : null;
    const to = dateTo.trim().length === 10 ? dateTo.trim() : null;

    const serviceRows = items
      .filter((e) => {
        const cat = (e.category ?? "other") as ServiceEntryCategory;
        if (categoryFilter !== "all" && cat !== categoryFilter) return false;
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

    const reminderRows = showReminders
      ? reminders
          .filter((r) => {
            if (r.status !== "active") return false;
            const sortKey = r.due_date
              ? String(r.due_date).slice(0, 10)
              : "9999-12-31";
            if (from && r.due_date && sortKey < from) return false;
            if (to && r.due_date && sortKey > to) return false;
            if (q.length) {
              const hay = `${r.title ?? ""}\n${r.notes ?? ""}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .map((r) => ({
            kind: "reminder" as const,
            id: r.id,
            sortKey: r.due_date
              ? String(r.due_date).slice(0, 10)
              : "9999-12-31",
            reminder: r,
          }))
      : [];

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

    // Reminders are always sorted by date (newest first)
    const sortedReminderRows = [...reminderRows].sort((a, b) =>
      a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? 1 : -1,
    );

    // Combine: if sorting by date, mix reminders with service entries
    // If sorting by title/cost, show service entries first, then reminders
    let allRows: Array<(typeof serviceRows)[0] | (typeof reminderRows)[0]>;

    if (sortBy === "date") {
      // Mix reminders and service entries, sort by date
      const mixed: Array<(typeof serviceRows)[0] | (typeof reminderRows)[0]> = [
        ...sortedReminderRows,
        ...sortedServiceRows,
      ];
      allRows = mixed.sort((a, b) => {
        if (a.sortKey === b.sortKey) return 0;
        if (sortOrder === "newest") {
          return a.sortKey < b.sortKey ? 1 : -1;
        } else {
          return a.sortKey > b.sortKey ? 1 : -1;
        }
      });
    } else {
      // Sort by title/cost: service entries first, then reminders
      allRows = [...sortedServiceRows, ...sortedReminderRows];
    }

    return allRows;
  }, [
    items,
    reminders,
    query,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
    showReminders,
    sortOption,
  ]);

  const sortByDate = sortOption.startsWith("date");
  const getMonthYearKey = (row: { sortKey: string }) =>
    row.sortKey === "9999-12-31" ? "future" : row.sortKey.slice(0, 7);

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

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
    >
      <View style={{ flex: 1 }}>
        <CustomFlatList<TimelineRow>
          data={timelineRows}
          listHeaderComponent={
            <>
              <ContentHeader title={t("dashboard.tiles.serviceTitle")} />
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
            if (rowItem.kind === "reminder") {
              const r = rowItem.reminder;
              const dueText = [
                r.due_date
                  ? t("reminders.dueTime", { date: r.due_date })
                  : null,
                r.due_mileage != null
                  ? t("reminders.dueMileage", {
                      mileage: String(r.due_mileage),
                      unit: distanceUnit,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <TimelineItem
                  title={r.title ?? t("reminders.title")}
                  subtitle={dueText}
                  onPress={() =>
                    navigation.navigate("ReminderForm", {
                      vehicleId,
                      reminderId: r.id,
                    })
                  }
                />
              );
            }

            const e = rowItem.entry;
            const cat = (e.category ?? "other") as ServiceEntryCategory;
            return (
              <TimelineItem
                title={e.title}
                icon={renderServiceIcon(cat)}
                iconBackgroundColor={SERVICE_CATEGORY_ICON_BACKGROUND[cat]}
                subtitle={[
                  e.service_date
                    ? formatDateDisplay(e.service_date, i18n.language)
                    : null,
                  e.mileage
                    ? `${e.mileage.toLocaleString()} ${distanceUnit}`
                    : null,
                  e.cost != null ? `${e.cost} ${currency}` : null,
                  attachmentsCount[e.id] > 0
                    ? `${attachmentsCount[e.id]} ${
                        attachmentsCount[e.id] === 1
                          ? t("attachments.attachmentLabel")
                          : t("attachments.title").toLowerCase()
                      }`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onPress={() =>
                  navigation.navigate("ServiceEntryForm", {
                    entryId: e.id,
                    vehicleId,
                  })
                }
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

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
  });
