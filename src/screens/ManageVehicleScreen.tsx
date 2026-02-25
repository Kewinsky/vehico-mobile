import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { AppNavbar } from "../ui/components/AppNavbar";
import { DriveTypeIcon } from "../ui/components/DriveTypeIcon";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { ContentHeader } from "../ui/components/ContentHeader";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicle">;

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
  onPhotoPress?: (index: number) => void;
};

function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
  onPhotoPress,
}: VehicleCarouselProps) {
  const progress = useSharedValue(0);
  const currentIndexRef = useRef(0);

  if (photoUrls.length === 0) return null;

  return (
    <Pressable
      onPress={() =>
        onPhotoPress?.(Math.round(currentIndexRef.current) % photoUrls.length)
      }
      style={{ width, height, overflow: "hidden" }}
    >
      <View style={{ position: "relative", width, height }}>
        <Carousel
          loop={true}
          snapEnabled={true}
          pagingEnabled={true}
          data={photoUrls}
          width={width}
          height={height}
          onProgressChange={(_, absoluteProgress) => {
            progress.value = absoluteProgress;
            currentIndexRef.current = absoluteProgress;
          }}
          renderItem={({ item: url }) => (
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <Image
                source={{ uri: url }}
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: theme.colors.card,
                }}
                contentFit="cover"
                transition={200}
              />
            </View>
          )}
        />
        {photoUrls.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: theme.spacing.md,
              right: theme.spacing.md,
              zIndex: 10,
            }}
            pointerEvents="none"
          >
            <Pagination.Basic
              progress={progress}
              data={photoUrls.map((url) => ({ url }))}
              dotStyle={{
                backgroundColor: "rgba(255,255,255,0.5)",
                borderRadius: 50,
              }}
              activeDotStyle={{
                backgroundColor: theme.colors.accent,
                borderRadius: 50,
              }}
              containerStyle={{ gap: 5 }}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ManageVehicleScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const v = await getVehicle(vehicleId);
        setVehicle(v);

        // Load all photos
        const photos = await listVehiclePhotos(
          vehicleId,
          isPremium ? undefined : { limit: photosPerVehicleLimit },
        );
        const urls = photos.map((photo) => getVehiclePhotoUrl(photo));
        setPhotoUrls(urls);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t, isPremium, photosPerVehicleLimit],
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false }),
    );
    return unsub;
  }, [navigation, load]);

  async function onCopyVin() {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("manageVehicle.vinCopied"));
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
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }

  function openActions() {
    if (!vehicle) return;
    Alert.alert(t("dashboard.tiles.manageTitle"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.edit"),
        onPress: () => navigation.navigate("VehicleForm", { vehicleId }),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: onDeleteVehicle,
      },
    ]);
  }

  const headerRight = vehicle ? (
    <Pressable
      onPress={openActions}
      hitSlop={10}
      style={({ pressed }) => [
        styles.menuButton,
        pressed && styles.menuButtonPressed,
      ]}
    >
      <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.fg} />
    </Pressable>
  ) : null;

  return (
    <FormScreen
      header={
        <AppNavbar onBack={() => navigation.goBack()} right={headerRight} />
      }
    >
      <ContentHeader title={t("dashboard.tiles.manageTitle")} />

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
                  width={
                    windowWidth - theme.layout.contentPaddingHorizontal * 2
                  }
                  height={220}
                  theme={theme}
                  onPhotoPress={(index) => setFullScreenIndex(index)}
                />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <MaterialCommunityIcons
                    name={vehicle.type === "car" ? "car-outline" : "motorbike"}
                    size={theme.spacing.xl * 2}
                    color={theme.colors.muted}
                  />
                </View>
              )}
            </View>
            <View>
              <View style={styles.detailsContent}>
                <Text
                  style={styles.detailsTitle}
                >{`${vehicle.make} ${vehicle.model}`}</Text>
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
              </View>
              <View style={styles.divider} />
              <View style={styles.detailsContent}>
                <View style={styles.detailsGrid}>
                  {/* Row 1: Rok + Przebieg */}
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
                            ? `${vehicle.mileage.toLocaleString()} ${distanceUnit}`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Row 2: Silnik + Moc */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="engine"
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

                  {/* Row 3: Skrzynia + Napęd */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="car-shift-pattern"
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
                                  | "vehicleForm.transmissionAutomatic",
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
                        <DriveTypeIcon size={18} color={theme.colors.accent} />
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

                  {/* Row 4: Rodzaj paliwa + Notatki (skrócone) */}
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
                                  | "vehicleForm.fuelTypeLpg",
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

                  {/* Row 5: Ubezpieczenie + Przegląd (gdy ustawione) */}
                  {(vehicle.insurance_valid_until != null ||
                    vehicle.inspection_valid_until != null) && (
                    <View style={styles.detailsRow}>
                      {vehicle.insurance_valid_until != null && (
                        <View style={styles.detailItem}>
                          <View
                            style={[
                              styles.detailIconContainer,
                              {
                                backgroundColor: theme.colors.accent + "25",
                              },
                            ]}
                          >
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={18}
                              color={theme.colors.accent}
                            />
                          </View>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>
                              {t("manageVehicle.insuranceLabel")}
                            </Text>
                            <Text style={styles.detailValue}>
                              {vehicle.insurance_valid_until}
                            </Text>
                          </View>
                        </View>
                      )}
                      {vehicle.inspection_valid_until != null && (
                        <View style={styles.detailItem}>
                          <View
                            style={[
                              styles.detailIconContainer,
                              {
                                backgroundColor: theme.colors.accent + "25",
                              },
                            ]}
                          >
                            <Ionicons
                              name="checkmark-done-outline"
                              size={18}
                              color={theme.colors.accent}
                            />
                          </View>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>
                              {t("manageVehicle.inspectionLabel")}
                            </Text>
                            <Text style={styles.detailValue}>
                              {vehicle.inspection_valid_until}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          <Modal
            visible={fullScreenIndex !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setFullScreenIndex(null)}
          >
            <View
              style={[
                styles.fullScreenOverlay,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
              ]}
            >
              <Pressable
                style={[styles.fullScreenClose, { top: insets.top + 8 }]}
                onPress={() => setFullScreenIndex(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </Pressable>
              {fullScreenIndex !== null && photoUrls.length > 0 && (
                <FlatList
                  data={photoUrls}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={fullScreenIndex}
                  getItemLayout={(_, index) => ({
                    length: windowWidth,
                    offset: windowWidth * index,
                    index,
                  })}
                  keyExtractor={(url) => url}
                  renderItem={({ item: url }) => (
                    <View
                      style={{
                        width: windowWidth,
                        height: windowHeight - insets.top - insets.bottom,
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        source={{ uri: url }}
                        style={{
                          width: windowWidth,
                          height: windowHeight - insets.top - insets.bottom,
                        }}
                        contentFit="contain"
                      />
                    </View>
                  )}
                  showsHorizontalScrollIndicator={false}
                />
              )}
            </View>
          </Modal>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    headerSubtitle: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
    h2: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.md,
    },
    menuButton: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    menuButtonPressed: {
      opacity: 0.6,
    },
    muted: {
      marginTop: theme.spacing.sm / 2,
      color: theme.colors.muted,
      lineHeight: theme.typography.body + 4,
    },
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
      gap: theme.spacing.sm / 2,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    cardMeta: { fontSize: theme.typography.small, color: theme.colors.muted },

    detailsCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 4,
    },
    vehicleImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
      overflow: "hidden",
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
      fontSize: theme.spacing.xl * 2,
    },
    detailsContent: {
      padding: theme.spacing.md,
    },
    detailsTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.xs,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.bold,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
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
      gap: theme.spacing.xs / 2,
    },
    detailLabel: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: theme.spacing.md,
      zIndex: 10,
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: (theme.spacing.xl + theme.spacing.sm) / 2,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
