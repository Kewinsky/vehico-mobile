import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleTire } from "../types/domain";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../services/tires/tiresRepo";
import { AppNavbar } from "../ui/components/AppNavbar";
import { AppLayout } from "../ui/components/AppLayout";
import { Button } from "../ui/components/Button";
import { ContentHeader } from "../ui/components/ContentHeader";
import { EmptyState } from "../ui/components/EmptyState";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../ui/components/CustomFlatList";
import { TimelineItem } from "../ui/components/TimelineItem";

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

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => {
      void refreshEntitlements().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
    return unsub;
  }, [navigation, load, refreshEntitlements]);

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

  return (
    <AppLayout
      loading={loading}
      header={
        <AppNavbar
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
      footer={
        <Button onPress={onAddTirePress}>{t("wheels.addTireSingle")}</Button>
      }
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          data={tires}
          listHeaderComponent={
            <ContentHeader title={t("wheels.tiresSection")} />
          }
          keyExtractor={(item: VehicleTire) => item.id}
          renderItem={({ item }) => (
            <TimelineItem
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
    </AppLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    listWrap: { flex: 1 },
    list: { flex: 1 },
    listContent: { paddingBottom: insets.bottom },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    itemTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    badge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: "#000000",
      letterSpacing: 0.3,
    },
    itemSubtitle: {
      fontSize: theme.typography.small,
    },
  });
