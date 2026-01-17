import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { deleteVehicle, getVehicle } from "../services/vehicles/vehiclesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicle">;

export function ManageVehicleScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDeleteVehicle() {
    Alert.alert(
      t("manageVehicle.deleteVehicleTitle"),
      t("manageVehicle.deleteVehicleBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(vehicleId);
              navigation.popToTop();
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />

      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t("manageVehicle.title")}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate("ManageVehicleEdit", { vehicleId })
          }
          hitSlop={10}
        >
          <Text style={styles.editLink}>{t("common.edit")}</Text>
        </Pressable>
      </View>

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />
          <View style={styles.detailsCard}>
            <View style={styles.vehicleImageContainer}>
              {vehicle.profile_photo_url ? (
                <Image
                  source={{ uri: vehicle.profile_photo_url }}
                  style={styles.vehicleImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <Text style={styles.vehicleImagePlaceholderText}>
                    {vehicle.type === "car" ? "🚗" : "🏍️"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.detailsContent}>
              <Text style={styles.detailsTitle}>{vehicle.title}</Text>
              <View style={styles.divider} />
              <View style={styles.detailsGrid}>
                {/* Column A: Make, Model, Year, Transmission */}
                <View style={styles.detailsColumn}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "15" },
                      ]}
                    >
                      <Ionicons
                        name="construct-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.makeLabel")}
                      </Text>
                      <Text style={styles.detailValue}>{vehicle.make}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "15" },
                      ]}
                    >
                      <Ionicons
                        name="car-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.modelLabel")}
                      </Text>
                      <Text style={styles.detailValue}>{vehicle.model}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "15" },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.yearLabel")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {String(vehicle.production_year)}
                      </Text>
                    </View>
                  </View>
                  {vehicle.transmission ? (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="settings-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          {t("vehicleForm.transmissionLabel")}
                        </Text>
                        <Text style={styles.detailValue}>
                          {t(
                            `vehicleForm.transmission${
                              vehicle.transmission.charAt(0).toUpperCase() +
                              vehicle.transmission.slice(1)
                            }` as
                              | "vehicleForm.transmissionManual"
                              | "vehicleForm.transmissionAutomatic"
                          )}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Column B: VIN, Engine Capacity, Power, Fuel Type */}
                <View style={styles.detailsColumn}>
                  {vehicle.vin ? (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="barcode-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>VIN</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {vehicle.vin}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {vehicle.engine_capacity ? (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="speedometer-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          {t("vehicleForm.engineCapacityLabel")}
                        </Text>
                        <Text style={styles.detailValue}>
                          {vehicle.engine_capacity} cm³
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {vehicle.power_hp ? (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="flash-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          {t("vehicleForm.powerHpLabel")}
                        </Text>
                        <Text style={styles.detailValue}>
                          {vehicle.power_hp} HP
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {vehicle.fuel_type ? (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "15" },
                        ]}
                      >
                        <Ionicons
                          name="water-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          {t("vehicleForm.fuelTypeLabel")}
                        </Text>
                        <Text style={styles.detailValue}>
                          {t(
                            `vehicleForm.fuelType${
                              vehicle.fuel_type.charAt(0).toUpperCase() +
                              vehicle.fuel_type.slice(1)
                            }` as
                              | "vehicleForm.fuelTypePetrol"
                              | "vehicleForm.fuelTypeDiesel"
                              | "vehicleForm.fuelTypeHybrid"
                              | "vehicleForm.fuelTypeElectric"
                              | "vehicleForm.fuelTypeLpg"
                          )}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Notes: Full width */}
              {vehicle.notes ? (
                <>
                  <View style={{ height: theme.spacing.md }} />
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "15" },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.notesLabel")}
                      </Text>
                      <Text style={styles.detailValue} numberOfLines={3}>
                        {vehicle.notes}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={{ height: 28 }} />
          <Button onPress={onDeleteVehicle} variant="destructive">
            {t("manageVehicle.deleteVehicle")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    headerSubtitle: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    h2: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    cardRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      gap: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.fg },
    cardMeta: { fontSize: theme.typography.small, color: theme.colors.muted },

    detailsCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    vehicleImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
    },
    vehicleImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.card,
    },
    vehicleImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    vehicleImagePlaceholderText: {
      fontSize: 64,
    },
    detailsContent: {
      padding: theme.spacing.md,
    },
    detailsTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.fg,
      marginBottom: theme.spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    detailsGrid: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "flex-start",
    },
    detailsColumn: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    detailIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    detailContent: {
      flex: 1,
      gap: 4,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: theme.typography.body,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
