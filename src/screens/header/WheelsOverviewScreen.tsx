import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { VehicleTire, VehicleWheel } from "../../types/domain";
import {
  listVehicleTires,
  formatTireDimensions,
} from "../../services/tires/tiresRepo";
import {
  listVehicleWheels,
  formatWheelDimensions,
} from "../../services/wheels/wheelsRepo";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { toastError } from "../../ui/toast/toast";
import { RimIcon } from "../../ui/components/icons/RimIcon";
import { TireIcon } from "../../ui/components/icons/TireIcon";

type Props = NativeStackScreenProps<AppStackParamList, "Wheels">;

export function WheelsOverviewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    isPremium,
    tiresPerVehicleLimit,
    wheelsPerVehicleLimit,
    freePlanVehicleId,
    freePlanTireId,
    freePlanWheelId,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const tireOpts = useMemo(
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
  const wheelOpts = useMemo(
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

  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [tiresData, wheelsData] = await Promise.all([
          listVehicleTires(vehicleId, tireOpts),
          listVehicleWheels(vehicleId, wheelOpts),
        ]);
        setTires(tiresData);
        setWheels(wheelsData);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t, tireOpts, wheelOpts],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  const fittedTires = useMemo(
    () => tires.filter((x) => x.is_currently_fitted).slice(0, 2),
    [tires],
  );
  const fittedWheels = useMemo(
    () => wheels.filter((x) => x.is_currently_fitted).slice(0, 2),
    [wheels],
  );

  const content = (
    <>
      <View style={styles.row}>
        <Tile
          title={t("wheels.tiresSection")}
          icon={<TireIcon size={32} color={theme.colors.accent} />}
          onPress={() => navigation.navigate("TiresList", { vehicleId })}
          minHeight={110}
        />
        <Tile
          title={t("wheels.rimsSection")}
          icon={<RimIcon size={32} color={theme.colors.accent} />}
          onPress={() => navigation.navigate("WheelsList", { vehicleId })}
          minHeight={110}
        />
      </View>

      <View style={{ height: theme.spacing.sm }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
        {t("wheels.currentlyFitted")}
      </Text>
      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <View style={styles.currentRow}>
          <TireIcon size={24} color={theme.colors.muted} />
          <View style={styles.currentRowText}>
            {fittedTires.length === 0 ? (
              <Text style={[styles.cardValue, { color: theme.colors.muted }]}>
                {t("wheels.noTires")}
              </Text>
            ) : (
              <View style={{ gap: theme.spacing.xs }}>
                {fittedTires.map((x) => (
                  <Text
                    key={x.id}
                    style={[styles.cardValue, { color: theme.colors.fg }]}
                    numberOfLines={1}
                  >
                    {`${formatTireDimensions(
                      x.width_mm,
                      x.aspect_ratio,
                      x.diameter_inch,
                    )} · ${x.name}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.currentRow}>
          <RimIcon size={24} color={theme.colors.muted} />
          <View style={styles.currentRowText}>
            {fittedWheels.length === 0 ? (
              <Text style={[styles.cardValue, { color: theme.colors.muted }]}>
                {t("wheels.noWheels")}
              </Text>
            ) : (
              <View style={{ gap: theme.spacing.xs }}>
                {fittedWheels.map((x) => (
                  <Text
                    key={x.id}
                    style={[styles.cardValue, { color: theme.colors.fg }]}
                    numberOfLines={1}
                  >
                    {`${formatWheelDimensions(
                      x.width_inch,
                      x.diameter_inch,
                    )} · ${x.name}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </>
  );

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
      showShopIcon={!isPremium}
      title={t("wheels.title")}
    >
      {content}
    </HeaderContentScreen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.sm,
    },
    card: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      overflow: "hidden",
    },
    cardLabel: {
      fontSize: theme.typography.small,
    },
    cardValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    currentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    currentRowText: { flex: 1, minWidth: 0 },
    divider: { height: 1, width: "100%" },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
}
