import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";

import { routes } from "../../core/navigation/routes";
import { usePremiumNavigation } from "../../core/hooks/usePremiumNavigation";
import type { VehicleTire, TireType } from "../../types/domain";
import { useScreenFocusReload } from "../../core/useScreenFocusReload";
import {
  deleteVehicleTire,
  listVehicleTires,
  updateVehicleTire,
} from "../../services/tires/tiresRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { openAlertPicker } from "../../ui/components/common/openAlertPicker";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../core/providers/EntitlementsProvider";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { TiresItem } from "../../ui/components/list/TiresItem";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";

const TIRE_TYPE_OPTIONS: TireType[] = [
  "summer",
  "winter",
  "all_season",
  "run_flat",
  "uhp",
  "suv_xl",
];

export function TiresListScreen() {
  const router = useRouter();
  const premiumNavigation = usePremiumNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam;
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
      if (!vehicleId) return;
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
        toastError(e?.message ?? t("common.error"));
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
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ]);
    },
    [t],
  );

  const onAddTirePress = useCallback(() => {
    if (!vehicleId) return;
    if (!isPremium && tires.length >= tiresPerVehicleLimit) {
      Alert.alert(
        t("limits.tireLimitReachedTitle"),
        t("limits.tireLimitReachedBody", { limit: tiresPerVehicleLimit }),
        getPremiumUpgradeAlertButtons(t, premiumNavigation),
      );
      return;
    }
    router.push(routes.tireForm(vehicleId));
  }, [isPremium, premiumNavigation, router, t, tires.length, tiresPerVehicleLimit, vehicleId]);

  const openFilters = useCallback(() => {
    openAlertPicker({
      title: "",
      cancelLabel: t("common.cancel"),
      choices: [
        { label: t("common.all"), onPress: () => setTireTypeFilter("all") },
        ...TIRE_TYPE_OPTIONS.map((type) => ({
          label: t(`tireForm.types.${type}`),
          onPress: () => setTireTypeFilter(type),
        })),
      ],
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
      onBack={() => router.back()}
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
              onPress={() => {
                if (!vehicleId) return;
                router.push(routes.tireForm(vehicleId, item.id));
              }}
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
