import { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { deleteVehicle, getVehicle } from "../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicle">;

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
};

function VehicleCarousel({ photoUrls, width, height, theme }: VehicleCarouselProps) {
  const progress = useSharedValue(0);

  if (photoUrls.length === 0) return null;

  return (
    <View>
      <Carousel
        loop={true}
        snapEnabled={true}
        pagingEnabled={true}
        data={photoUrls}
        width={width}
        height={height}
        onProgressChange={(offsetProgress, absoluteProgress) => {
          progress.value = absoluteProgress;
        }}
        renderItem={({ item: url }) => (
          <Image
            source={{ uri: url }}
            style={{ width: "100%", height: "100%", backgroundColor: theme.colors.card }}
            contentFit="cover"
            transition={200}
          />
        )}
      />
      {photoUrls.length > 1 && (
        <Pagination.Basic
          progress={progress}
          data={photoUrls.map((url) => ({ url }))}
          dotStyle={{ backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 50 }}
          activeDotStyle={{ backgroundColor: theme.colors.accent, borderRadius: 50 }}
          containerStyle={{ gap: 5, marginTop: 10 }}
        />
      )}
    </View>
  );
}

export function ManageVehicleScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const windowWidth = Dimensions.get("window").width;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      
      // Load all photos
      const photos = await listVehiclePhotos(vehicleId);
      const urls = photos.map((photo) => getVehiclePhotoUrl(photo));
      setPhotoUrls(urls);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  async function onCopyVin() {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("common.copied"), t("manageVehicle.vinCopied"));
    }
  }

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
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>{t("dashboard.tiles.manageTitle")}</Text>
          <Pressable
            onPress={() =>
              navigation.navigate("ManageVehicleEdit", { vehicleId })
            }
            hitSlop={10}
          >
            <Text style={styles.editLink}>{t("common.edit")}</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {t("dashboard.tiles.manageSubtitle")}
        </Text>
      </View>
      <View style={{ height: theme.spacing.md }} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      ) : vehicle ? (
        <>
          <View style={styles.detailsCard}>
            <View style={styles.vehicleImageContainer}>
              {photoUrls.length > 0 ? (
                <VehicleCarousel
                  photoUrls={photoUrls}
                  width={windowWidth - theme.spacing.md * 2}
                  height={220}
                  theme={theme}
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
              {vehicle.vin && (
                <Pressable
                  onPress={onCopyVin}
                  style={styles.vinRow}
                  hitSlop={10}
                >
                  <Text style={styles.vinText}>{vehicle.vin}</Text>
                  <Ionicons
                    name="copy-outline"
                    size={16}
                    color={theme.colors.muted}
                  />
                </Pressable>
              )}
              <View style={styles.divider} />
              <View style={styles.detailsGrid}>
                {/* Row 1: Marka + Model */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        { backgroundColor: theme.colors.accent + "25" },
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
                </View>

                {/* Row 2: Rok + Przebieg */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        {t("vehicleForm.mileageLabel")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {vehicle.mileage
                          ? `${vehicle.mileage.toLocaleString()} km`
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Row 3: Silnik + Moc */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        {t("vehicleForm.engineCapacityLabel")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {vehicle.engine_capacity
                          ? `${vehicle.engine_capacity} cm³`
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        {vehicle.power_hp ? `${vehicle.power_hp} HP` : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Row 4: Skrzynia + Napęd */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
                      ]}
                    >
                      <Ionicons
                        name="cog-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.transmissionLabel")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {vehicle.transmission
                          ? t(
                              `vehicleForm.transmission${
                                vehicle.transmission.charAt(0).toUpperCase() +
                                vehicle.transmission.slice(1)
                              }` as
                                | "vehicleForm.transmissionManual"
                                | "vehicleForm.transmissionAutomatic"
                            )
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
                      ]}
                    >
                      <Ionicons
                        name="git-branch-outline"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {t("vehicleForm.driveTypeLabel")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {vehicle.drive_type || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Row 5: Rodzaj paliwa + Notatki (skrócone) */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        {vehicle.fuel_type
                          ? t(
                              `vehicleForm.fuelType${
                                vehicle.fuel_type.charAt(0).toUpperCase() +
                                vehicle.fuel_type.slice(1)
                              }` as
                                | "vehicleForm.fuelTypePetrol"
                                | "vehicleForm.fuelTypeDiesel"
                                | "vehicleForm.fuelTypeHybrid"
                                | "vehicleForm.fuelTypeElectric"
                                | "vehicleForm.fuelTypeLpg"
                            )
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: theme.colors.accent + "25" },
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
                        {t("manageVehicle.notesLabel")}
                      </Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {vehicle.notes
                          ? vehicle.notes.length > 30
                            ? `${vehicle.notes.substring(0, 30)}...`
                            : vehicle.notes
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
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
    headerSection: {
      gap: theme.spacing.xs / 2,
    },
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    subtitle: { fontSize: 13, color: theme.colors.muted },
    headerSubtitle: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    h2: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
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
      marginBottom: theme.spacing.xs,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    detailsGrid: {
      gap: theme.spacing.sm,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "flex-start",
    },
    detailsColumn: {
      flex: 1,
      minWidth: 0, // Allows flex items to shrink below their content size
    },
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      minWidth: 0, // Allows flex items to shrink below their content size
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
