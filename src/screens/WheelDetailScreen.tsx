import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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

  function showActionsMenu() {
    Alert.alert("", "", [
      {
        text: t("common.edit"),
        onPress: () => navigation.navigate("WheelForm", { vehicleId, wheelId }),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: onDelete,
      },
      { text: t("common.cancel"), style: "cancel" },
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
          <Text
            style={[styles.title, { color: theme.colors.fg }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {wheel.name || t("wheelDetail.title")}
          </Text>
          <Pressable
            onPress={showActionsMenu}
            hitSlop={10}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.colors.fg}
            />
          </Pressable>
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
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.name")}
              </Text>
            </View>
            <Text
              style={[styles.value, { color: theme.colors.fg }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {wheel.name}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Ionicons
                name="resize-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelDetail.labels.dimensions")}
              </Text>
            </View>
            <Text style={[styles.value, { color: theme.colors.fg }]}>
              {dims}
            </Text>
          </View>
          {wheel.et_offset != null ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.etOffset")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                ET{wheel.et_offset}
              </Text>
            </View>
          ) : null}
          {wheel.bolt_pattern?.trim() ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.boltPattern")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.bolt_pattern}
              </Text>
            </View>
          ) : null}
          {wheel.center_bore_mm != null ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="disc-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.centerBore")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {t("wheels.centerBoreAbbr")} {wheel.center_bore_mm}mm
              </Text>
            </View>
          ) : null}
          {wheel.bolt_type?.trim() ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="construct-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.boltType")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.bolt_type}
              </Text>
            </View>
          ) : null}
          {wheel.weight_kg != null ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="barbell-outline"
                  size={20}
                  color={theme.colors.muted}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.weight")}
                </Text>
              </View>
              <Text style={[styles.value, { color: theme.colors.fg }]}>
                {wheel.weight_kg} kg
              </Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("wheelForm.isCurrentlyFitted")}
              </Text>
            </View>
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
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    menuButton: {
      padding: theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    detailsCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 0,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: "400",
      textAlign: "right",
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
  });
