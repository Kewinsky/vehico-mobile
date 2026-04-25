import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleTire, TireType } from "../../types/domain";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { TiresItem } from "../../ui/components/list/TiresItem";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";

type Props = NativeStackScreenProps<AppStackParamList, "TiresList">;

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
  const [tireTypeFilter, setTireTypeFilter] = useState<TireType | "all">("all");
  const TIRE_TYPE_OPTIONS: TireType[] = [
    "summer",
    "winter",
    "all_season",
    "run_flat",
    "uhp",
    "suv_xl",
  ];

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

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  const hasActiveFilters = tireTypeFilter !== "all";

  const filteredTires = useMemo(() => {
    let list = tires;
    if (tireTypeFilter !== "all") {
      list = list.filter((tire) => tire.tire_type === tireTypeFilter);
    }
    return [...list].sort((a, b) => {
      const cmp = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
      return cmp;
    });
  }, [tires, tireTypeFilter]);

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
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setTireTypeFilter("all") },
      ...TIRE_TYPE_OPTIONS.map((type) => ({
        text: t(`tireForm.types.${type}`),
        onPress: () => setTireTypeFilter(type),
      })),
    ];
    Alert.alert(t("tires.filterByType"), t("common.chooseOption"), buttons, {
      cancelable: true,
    });
  }, [t]);

  const resetFilters = useCallback(() => {
    setTireTypeFilter("all");
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
            <ContentHeader title={t("wheels.tiresSection")} />
          }
          keyExtractor={(item: VehicleTire) => item.id}
          renderItem={({ item }) => (
            <TiresItem
              tire={item}
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
