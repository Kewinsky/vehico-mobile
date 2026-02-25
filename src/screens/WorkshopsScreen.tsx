import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { WorkshopsFiltersParams } from "./WorkshopsFiltersScreen";
import type { Workshop, WorkshopType } from "../types/domain";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import { getAndClearPendingModalResult } from "../app/pendingModalResult";
import { AppNavbar } from "../ui/components/AppNavbar";
import { AppLayout } from "../ui/components/AppLayout";
import { HeaderWithSearch } from "../ui/components/HeaderWithSearch";
import { ContentHeader } from "../ui/components/ContentHeader";
import { CustomFlatList } from "../ui/components/CustomFlatList";
import { EmptyState } from "../ui/components/EmptyState";
import { TimelineItem } from "../ui/components/TimelineItem";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Workshops">;

export function WorkshopsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const {
    isPremium,
    workshopsLimit,
    freePlanWorkshopIds,
    refresh: refreshEntitlements,
  } = useEntitlements();

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const options = isPremium ? undefined : { freePlanWorkshopIds };
        const data = await listWorkshops(options);
        setItems(data);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t, isPremium, freePlanWorkshopIds],
  );

  const loadRef = useRef(load);
  loadRef.current = load;
  const refreshEntitlementsRef = useRef(refreshEntitlements);
  refreshEntitlementsRef.current = refreshEntitlements;

  useEffect(() => {
    void load({ showLoading: false });
    const unsub = navigation.addListener("focus", () => {
      const pending = getAndClearPendingModalResult<WorkshopsFiltersParams>(
        "workshops",
      );
      if (pending) {
        setTypeFilter(pending.typeFilter ?? "all");
        setSortOrder(pending.sortOrder ?? "az");
      }
      void refreshEntitlementsRef.current?.().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
    return unsub;
  }, [navigation, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (typeFilter !== "all") {
      list = list.filter((w) => w.workshop_type === typeFilter);
    }
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.phone_number ?? "").toLowerCase().includes(q) ||
          (w.address ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return sortOrder === "az" ? cmp : -cmp;
    });
    return sorted;
  }, [items, query, typeFilter, sortOrder]);

  const hasActiveFilters = typeFilter !== "all" || sortOrder !== "az";

  function onAddWorkshopPress() {
    if (!isPremium && items.length >= workshopsLimit) {
      Alert.alert(
        t("limits.workshopLimitReachedTitle"),
        t("limits.workshopLimitReachedBody", { limit: workshopsLimit }),
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
    navigation.navigate("WorkshopForm", {});
  }

  const openFilters = useCallback(() => {
    navigation.navigate("WorkshopsFilters", {
      typeFilter,
      sortOrder,
    });
  }, [navigation, typeFilter, sortOrder]);

  const renderHeaderRight = (
    openSearch: () => void,
    hasSearchQuery: boolean,
  ) => (
    <View style={styles.headerRight}>
      <Pressable
        onPress={openSearch}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed && styles.headerIconBtnPressed,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={22}
          color={hasSearchQuery ? theme.colors.accent : theme.colors.fg}
        />
      </Pressable>
      <Pressable
        onPress={openFilters}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed && styles.headerIconBtnPressed,
        ]}
      >
        <Ionicons
          name="filter-outline"
          size={22}
          color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
        />
      </Pressable>
      <Pressable
        onPress={onAddWorkshopPress}
        style={({ pressed }) => [
          styles.headerIconBtn,
          pressed && styles.headerIconBtnPressed,
        ]}
      >
        <Ionicons name="add" size={24} color={theme.colors.fg} />
      </Pressable>
    </View>
  );

  return (
    <AppLayout
      loading={loading}
      header={
        <HeaderWithSearch
          query={query}
          onQueryChange={setQuery}
          placeholder={t("common.search", { defaultValue: "Search" })}
          cancelLabel={t("common.cancel")}
          renderHeaderContent={(openSearch, hasSearchQuery) => (
            <AppNavbar
              onBack={() => navigation.goBack()}
              right={renderHeaderRight(openSearch, hasSearchQuery)}
            />
          )}
        />
      }
    >
      <CustomFlatList<Workshop>
        data={filtered}
        listHeaderComponent={
          <ContentHeader title={t("workshops.title")} />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TimelineItem
            title={item.name}
            subtitle={item.address ?? undefined}
            onPress={() =>
              navigation.navigate("WorkshopForm", { workshopId: item.id })
            }
          />
        )}
        ListEmptyComponent={<EmptyState body={t("workshops.noWorkshops")} />}
      />
    </AppLayout>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerIconBtn: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    headerIconBtnPressed: {
      opacity: 0.6,
    },
  });
}
