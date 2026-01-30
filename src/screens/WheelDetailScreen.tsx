import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleWheel } from "../types/domain";
import {
  getVehicleWheel,
  deleteVehicleWheel,
  formatWheelDimensions,
} from "../services/wheels/wheelsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "WheelDetail">;

export function WheelDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { vehicleId, wheelId } = route.params;

  const [wheel, setWheel] = useState<VehicleWheel | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVehicleWheel(wheelId);
      setWheel(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as any).message)
          : t("common.error");
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, [wheelId, t]);

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  function onDelete() {
    Alert.alert(t("wheels.deleteWheelTitle"), t("wheels.deleteWheelBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVehicleWheel(wheelId);
            navigation.goBack();
          } catch (err: unknown) {
            const message =
              err && typeof err === "object" && "message" in err
                ? String((err as any).message)
                : t("common.error");
            toastError(message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  if (!wheel) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  const dims = formatWheelDimensions(wheel.width_inch, wheel.diameter_inch);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.top, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("wheelDetail.title")}
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() =>
                navigation.navigate("WheelForm", { vehicleId, wheelId })
              }
              hitSlop={10}
            >
              <Text style={[styles.editLink, { color: theme.colors.muted }]}>
                {t("common.edit")}
              </Text>
            </Pressable>
            <Pressable onPress={() => onDelete()} hitSlop={10}>
              <Text style={[styles.deleteLink, { color: theme.colors.danger }]}>
                {t("common.delete")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.detailsCard,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text style={[styles.detailsTitle, { color: theme.colors.fg }]}>
            {wheel.name}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("wheelForm.name")}
            </Text>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {wheel.name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("wheelDetail.labels.dimensions")}
            </Text>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {dims}
            </Text>
          </View>
          {wheel.et_offset != null ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.etOffset")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                ET{wheel.et_offset}
              </Text>
            </View>
          ) : null}
          {wheel.bolt_pattern?.trim() ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.boltPattern")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.bolt_pattern}
              </Text>
            </View>
          ) : null}
          {wheel.center_bore_mm != null ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.centerBore")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {t("wheels.centerBoreAbbr")} {wheel.center_bore_mm}mm
              </Text>
            </View>
          ) : null}
          {wheel.bolt_type?.trim() ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.boltType")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.bolt_type}
              </Text>
            </View>
          ) : null}
          {wheel.weight_kg != null ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.weight")}
              </Text>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.weight_kg} kg
              </Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("wheelForm.isCurrentlyFitted")}
            </Text>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {wheel.is_currently_fitted ? t("common.yes") : t("common.no")}
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    top: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { fontWeight: "800" },
    deleteLink: { fontWeight: "800" },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    detailsCard: {
      marginTop: 12,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    detailsTitle: { fontSize: theme.typography.body, fontWeight: "800" },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    value: {
      fontSize: theme.typography.small,
      fontWeight: "400",
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
  });
