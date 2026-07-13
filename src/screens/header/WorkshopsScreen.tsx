import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { Workshop, WorkshopType } from "../../types/domain";
import { listWorkshops } from "../../services/workshops/workshopsRepo";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { SearchBar } from "../../ui/components/common/SearchBar";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { WorkshopItem } from "../../ui/components/list/WorkshopItem";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";
import { openAlertPicker } from "../../ui/components/common/openAlertPicker";

type Props = NativeStackScreenProps<AppStackParamList, "Workshops">;

const WORKSHOP_TYPE_OPTIONS: WorkshopType[] = [
  "mechanic",
  "electrician",
  "detailer",
  "bodywork",
  "car_wash",
  "other",
];

export function WorkshopsScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">("all");

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
        toastCaughtError(e, t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t, isPremium, freePlanWorkshopIds],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

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
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return cmp;
    });
  }, [items, query, typeFilter]);

  const hasActiveFilters = typeFilter !== "all";

  const onAddWorkshopPress = useCallback(() => {
    if (!isPremium && items.length >= workshopsLimit) {
      Alert.alert(
        t("limits.workshopLimitReachedTitle"),
        t("limits.workshopLimitReachedBody", { limit: workshopsLimit }),
        getPremiumUpgradeAlertButtons(t, navigation),
      );
      return;
    }
    navigation.navigate("WorkshopForm", {});
  }, [isPremium, items.length, navigation, t, workshopsLimit]);

  const openFilters = useCallback(() => {
    openAlertPicker({
      cancelLabel: t("common.cancel"),
      choices: [
        { label: t("workshops.typeAll"), onPress: () => setTypeFilter("all") },
        ...WORKSHOP_TYPE_OPTIONS.map((type) => ({
          label: t(`workshopForm.types.${type}`),
          onPress: () => setTypeFilter(type),
        })),
      ],
    });
  }, [t]);

  const resetFilters = useCallback(() => {
    setTypeFilter("all");
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
        onPress: onAddWorkshopPress,
      },
    ],
    [hasActiveFilters, onAddWorkshopPress, openFilters, resetFilters],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
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
          <WorkshopItem
            workshop={item}
            callLabel={t("workshops.call")}
            navigateLabel={t("workshops.navigate")}
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
