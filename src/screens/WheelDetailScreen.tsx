import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.h1, { color: theme.colors.fg }]}
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
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.row}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View style={styles.rowContent}>
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.name")}
                </Text>
                <Text
                  style={[styles.value, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {wheel.name}
                </Text>
              </View>
            </View>
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="resize-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View style={styles.rowContent}>
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelDetail.labels.dimensions")}
                </Text>
                <Text style={[styles.value, { color: theme.colors.fg }]}>
                  {dims}
                </Text>
              </View>
            </View>
            {wheel.et_offset != null ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.row}>
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.label, { color: theme.colors.muted }]}>
                      {t("wheelForm.etOffset")}
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.fg }]}>
                      ET{wheel.et_offset}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            {wheel.bolt_pattern?.trim() ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.row}>
                  <Ionicons
                    name="grid-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.label, { color: theme.colors.muted }]}>
                      {t("wheelForm.boltPattern")}
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.fg }]}>
                      {wheel.bolt_pattern}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            {wheel.center_bore_mm != null ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.row}>
                  <Ionicons
                    name="disc-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.label, { color: theme.colors.muted }]}>
                      {t("wheelForm.centerBore")}
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.fg }]}>
                      {t("wheels.centerBoreAbbr")} {wheel.center_bore_mm}mm
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            {wheel.bolt_type?.trim() ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.row}>
                  <Ionicons
                    name="construct-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.label, { color: theme.colors.muted }]}>
                      {t("wheelForm.boltType")}
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.fg }]}>
                      {wheel.bolt_type}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            {wheel.weight_kg != null ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.row}>
                  <Ionicons
                    name="barbell-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.label, { color: theme.colors.muted }]}>
                      {t("wheelForm.weight")}
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.fg }]}>
                      {wheel.weight_kg} kg
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View style={styles.rowContent}>
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("wheelForm.isCurrentlyFitted")}
                </Text>
                <Text style={[styles.value, { color: theme.colors.fg }]}>
                  {wheel.is_currently_fitted ? t("common.yes") : t("common.no")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.md,
    },
    h1: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
    },
    menuButton: {
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
    },
    divider: { height: 1, width: "100%" },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "600",
      marginBottom: 2,
    },
    value: {
      fontSize: theme.typography.body,
      fontWeight: "400",
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
  });
