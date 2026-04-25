import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleWheel } from "../../types/domain";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import {
  listVehicleWheels,
} from "../../services/wheels/wheelsRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { WheelItem } from "../../ui/components/list/WheelItem";
import type { HeaderAction } from "../../ui/components/layout/AppNavbar";

type Props = NativeStackScreenProps<AppStackParamList, "WheelsList">;

export function WheelsListScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { vehicleId } = route.params;
  const {
    isPremium,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanWheelId,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const wheelOptions = useMemo(
    () =>
      isPremium
        ? undefined
        : freePlanVehicleId === vehicleId
          ? { freePlanWheelId: freePlanWheelId ?? null }
          : { limit: wheelsPerVehicleLimit },
    [
      isPremium,
      vehicleId,
      freePlanVehicleId,
      freePlanWheelId,
      wheelsPerVehicleLimit,
    ],
  );

  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listVehicleWheels(vehicleId, wheelOptions);
        setWheels(data);
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
    [vehicleId, t, wheelOptions],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  const filteredWheels = useMemo(() => {
    return [...wheels].sort((a, b) => {
      const cmp = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
      return cmp;
    });
  }, [wheels]);

  function onAddWheelPress() {
    if (!isPremium && wheels.length >= wheelsPerVehicleLimit) {
      Alert.alert(
        t("limits.wheelLimitReachedTitle"),
        t("limits.wheelLimitReachedBody", { limit: wheelsPerVehicleLimit }),
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
    navigation.navigate("WheelForm", { vehicleId });
  }

  const headerActions: HeaderAction[] = useMemo(
    () => [
      {
        type: "add",
        onPress: onAddWheelPress,
      },
    ],
    [onAddWheelPress],
  );

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      actions={headerActions}
    >
      <View style={styles.listWrap}>
        <CustomFlatList
          data={filteredWheels}
          listHeaderComponent={
            <>
              <ContentHeader title={t("wheels.rimsSection")} />
            </>
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WheelItem
              wheel={item}
              onPress={() =>
                navigation.navigate("WheelForm", {
                  vehicleId,
                  wheelId: item.id,
                })
              }
            />
          )}
          ListEmptyComponent={<EmptyState body={t("wheels.noWheels")} />}
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
