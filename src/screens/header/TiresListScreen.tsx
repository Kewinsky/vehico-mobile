import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Plus, RefreshCcw, SlidersHorizontal } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleTire, TireType } from "../../types/domain";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import {
  deleteVehicleTire,
  listVehicleTires,
  updateVehicleTire,
} from "../../services/tires/tiresRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import {
  SourcePickerMenu,
  type SourcePickerMenuItem,
} from "../../ui/components/common/SourcePickerMenu";
import { useTheme } from "../../ui/ThemeProvider";
import { toastCaughtError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { TiresItem } from "../../ui/components/list/TiresItem";

type Props = NativeStackScreenProps<AppStackParamList, "TiresList">;

const TIRE_TYPE_OPTIONS: TireType[] = [
  "summer",
  "winter",
  "all_season",
  "run_flat",
  "uhp",
  "suv_xl",
];

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

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleTires(vehicleId, tireOptions);
        setTires(data);
      } catch (err: unknown) {
        toastCaughtError(err, t("common.error"));
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

  const handleToggleInUse = useCallback(
    async (tire: VehicleTire) => {
      try {
        const updated = await updateVehicleTire(tire.id, {
          is_currently_fitted: !tire.is_currently_fitted,
        });
        setTires((prev) =>
          prev.map((item) => (item.id === tire.id ? updated : item)),
        );
      } catch (e: any) {
        if (e?.message === "FITTED_TIRE_LIMIT_REACHED") {
          Alert.alert(
            t("limits.fittedTireLimitReachedTitle"),
            t("limits.fittedTireLimitReachedBody"),
          );
          return;
        }
        toastCaughtError(e, t("common.error"));
      }
    },
    [t],
  );

  const handleDeleteTire = useCallback(
    (tire: VehicleTire) => {
      Alert.alert(t("wheels.deleteTireTitle"), t("wheels.deleteTireBody"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleTire(tire.id);
              setTires((prev) => prev.filter((item) => item.id !== tire.id));
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ]);
    },
    [t],
  );

  const onAddTirePress = useCallback(() => {
    if (!isPremium && tires.length >= tiresPerVehicleLimit) {
      Alert.alert(
        t("limits.tireLimitReachedTitle"),
        t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
        getPremiumUpgradeAlertButtons(t, navigation),
      );
      return;
    }
    navigation.navigate("TireForm", { vehicleId });
  }, [isPremium, navigation, t, tires.length, tiresPerVehicleLimit, vehicleId]);

  const filterMenuItems = useMemo(
    (): SourcePickerMenuItem[] => [
      {
        id: "all",
        label: t("common.all"),
        onPress: () => setTireTypeFilter("all"),
      },
      ...TIRE_TYPE_OPTIONS.map((type) => ({
        id: type,
        label: t(`tireForm.types.${type}`),
        onPress: () => setTireTypeFilter(type),
      })),
    ],
    [t],
  );

  const resetFilters = useCallback(() => {
    setTireTypeFilter("all");
  }, []);

  const headerRight = useMemo(
    () => (
      <View style={styles.headerRight}>
        {hasActiveFilters ? (
          <HeaderButton
            onPress={resetFilters}
            tintColor={theme.colors.accent}
            accessibilityLabel="Reset filters"
          >
            <RefreshCcw size={20} color={theme.colors.accent} />
          </HeaderButton>
        ) : null}
        <SourcePickerMenu items={filterMenuItems}>
          <HeaderButton
            onPress={() => undefined}
            tintColor={theme.colors.accent}
            accessibilityLabel="Filter"
          >
            <SlidersHorizontal size={20} color={theme.colors.accent} />
          </HeaderButton>
        </SourcePickerMenu>
        <HeaderButton
          onPress={onAddTirePress}
          tintColor={theme.colors.accent}
          accessibilityLabel="Add"
        >
          <Plus size={20} color={theme.colors.accent} />
        </HeaderButton>
      </View>
    ),
    [
      filterMenuItems,
      hasActiveFilters,
      onAddTirePress,
      resetFilters,
      styles.headerRight,
      theme.colors.accent,
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
              onToggleInUse={() => void handleToggleInUse(item)}
              onDelete={() => handleDeleteTire(item)}
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
