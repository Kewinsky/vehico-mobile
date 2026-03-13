import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { WorkshopsFiltersParams } from "../modal/WorkshopsFiltersScreen";
import type { Workshop, WorkshopType } from "../../types/domain";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { getAndClearPendingModalResult } from "../../app/pendingModalResult";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { HeaderButton } from "@react-navigation/elements";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { TimelineItem } from "../../ui/components/list/TimelineItem";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";

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
      const pending =
        getAndClearPendingModalResult<WorkshopsFiltersParams>("workshops");
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

  const resetFilters = useCallback(() => {
    setTypeFilter("all");
    setSortOrder("az");
  }, []);

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
        <HeaderButton
          onPress={onAddWorkshopPress}
          tintColor={theme.colors.accent}
        >
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
      onAddWorkshopPress,
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
      <CustomFlatList<Workshop>
        data={filtered}
        listHeaderComponent={
          <>
            <ContentHeader title={t("workshops.title")} />
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
            subtitle={item.address ?? undefined}
            onPress={() =>
              navigation.navigate("WorkshopForm", { workshopId: item.id })
            }
          />
        )}
        ListEmptyComponent={<EmptyState body={t("workshops.noWorkshops")} />}
      />
    </HeaderLayout>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
  });
}
