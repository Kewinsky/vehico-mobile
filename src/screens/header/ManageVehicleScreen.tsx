import { useCallback, useRef, useState, type ReactNode } from "react";
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
import { HeaderIconButton } from "../../ui/components/layout/HeaderIconButton";
import { useTranslation } from "react-i18next";
import { Hash, CalendarCheck, Fuel } from "lucide-react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { Vehicle } from "../../types/domain";
import {
  deleteVehicle,
  getVehicle,
} from "../../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import { HeaderLayout } from "../../layouts";
import { DriveTypeIcon } from "../../ui/components/icons/DriveTypeIcon";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { toastCaughtError, toastSuccess } from "../../ui/toast/toast";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { groupThousands } from "../../utils/numberFormatting";

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
          <>
            <View
              style={{
                position: "absolute",
                bottom: theme.spacing.md,
                left: theme.spacing.md,
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
            <Pressable
              style={{
                position: "absolute",
                bottom: theme.spacing.md,
                right: theme.spacing.md,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() =>
                onPhotoPress?.(
                  Math.round(currentIndexRef.current) % photoUrls.length,
                )
              }
              hitSlop={8}
            >
              <FontAwesome5
                name="expand"
                size={16}
                color={theme.colors.accent}
              />
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
}

type DetailItemProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

function DetailItem({ icon, label, value }: DetailItemProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.detailItem}>
      {icon}
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function ManageVehicleScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const {
    isPremium,
    photosPerVehicleLimit,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;
  const { distanceUnitLabel } = useUnitDisplay();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const detailIconSize = 28;
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);

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
        toastCaughtError(e, t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t, isPremium, photosPerVehicleLimit],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

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
              toastCaughtError(e, t("common.error"));
            }
          },
        },
      ],
    );
  }

  function openActions() {
    if (!vehicle) return;
    Alert.alert(t("dashboard.tiles.manageTitle"), "", [
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
    <HeaderIconButton
      onPress={openActions}
      tintColor={theme.colors.fg}
      accessibilityLabel={undefined}
    >
      <Ionicons
        name="ellipsis-horizontal"
        size={theme.icons.headerButton}
        color={theme.colors.accent}
      />
    </HeaderIconButton>
  ) : null;

  return (
    <HeaderLayout
      onBack={() => navigation.goBack()}
      right={headerRight}
      paddingHorizontal={false}
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView
          paddingHorizontal={false}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {loading ? (
            <View
              style={[
                styles.loadingContainer,
                { minHeight: windowHeight - insets.top - insets.bottom },
              ]}
            >
              <LoadingIndicator />
            </View>
          ) : vehicle ? (
            <>
              <View
                style={[
                  styles.vehicleImageContainer,
                  { height: vehicleImageHeight },
                ]}
              >
                {photoUrls.length > 0 ? (
                  <VehicleCarousel
                    photoUrls={photoUrls}
                    width={windowWidth}
                    height={vehicleImageHeight}
                    theme={theme}
                    onPhotoPress={(index) => setFullScreenIndex(index)}
                  />
                ) : (
                  <View style={styles.vehicleImagePlaceholder}>
                    <MaterialCommunityIcons
                      name={
                        vehicle.type === "car" ? "car-outline" : "motorbike"
                      }
                      size={theme.spacing.xl * 2}
                      color={theme.colors.muted}
                    />
                  </View>
                )}
              </View>

              <View style={styles.contentSection}>
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
                <View style={styles.detailsGrid}>
                  {/* Row 1: Rok + Przebieg */}
                  <View style={styles.detailsRow}>
                    <DetailItem
                      icon={
                        <Ionicons
                          name="calendar-outline"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.yearLabel")}
                      value={String(vehicle.production_year)}
                    />
                    <DetailItem
                      icon={
                        <Ionicons
                          name="speedometer-outline"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.mileageLabel")}
                      value={
                        vehicle.mileage
                          ? `${groupThousands(vehicle.mileage, 0, i18n.language)} ${distanceUnitLabel}`
                          : "–"
                      }
                    />
                  </View>

                  {/* Row 2: Data pierwszej rej. + Numer rej. */}
                  <View style={styles.detailsRow}>
                    <DetailItem
                      icon={
                        <CalendarCheck
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.firstRegistrationDateLabel")}
                      value={vehicle.first_registration_date ?? "–"}
                    />
                    <DetailItem
                      icon={
                        <Hash
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.licensePlateLabel")}
                      value={vehicle.license_plate ?? "–"}
                    />
                  </View>

                  {/* Row 3: Poj. sil. + Moc */}
                  <View style={styles.detailsRow}>
                    <DetailItem
                      icon={
                        <MaterialCommunityIcons
                          name="engine"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.engineCapacityLabel")}
                      value={
                        vehicle.engine_capacity
                          ? `${groupThousands(vehicle.engine_capacity, 0, i18n.language)} cm³`
                          : "–"
                      }
                    />
                    <DetailItem
                      icon={
                        <Ionicons
                          name="flash-outline"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.powerHpLabel")}
                      value={
                        vehicle.power_hp
                          ? `${groupThousands(vehicle.power_hp, 0, i18n.language)} ${t("vehicleForm.powerOutputUnit")}`
                          : "–"
                      }
                    />
                  </View>

                  {/* Row 4: Skrzynia + Napęd */}
                  <View style={styles.detailsRow}>
                    <DetailItem
                      icon={
                        <MaterialCommunityIcons
                          name="car-shift-pattern"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.transmissionLabel")}
                      value={
                        vehicle.transmission
                          ? t(
                              `vehicleForm.transmission${
                                vehicle.transmission.charAt(0).toUpperCase() +
                                vehicle.transmission.slice(1)
                              }` as
                                | "vehicleForm.transmissionManual"
                                | "vehicleForm.transmissionAutomatic",
                            )
                          : "–"
                      }
                    />
                    <DetailItem
                      icon={
                        <DriveTypeIcon
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.driveTypeLabel")}
                      value={vehicle.drive_type || "–"}
                    />
                  </View>

                  {/* Row 4: Rodzaj paliwa + Notatki (skrócone) */}
                  <View style={styles.detailsRow}>
                    <DetailItem
                      icon={
                        <Fuel
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("vehicleForm.fuelTypeLabel")}
                      value={
                        vehicle.fuel_type
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
                          : "–"
                      }
                    />
                    <DetailItem
                      icon={
                        <Ionicons
                          name="document-text-outline"
                          size={detailIconSize}
                          color={theme.colors.accent}
                        />
                      }
                      label={t("manageVehicle.notesLabel")}
                      value={
                        vehicle.notes
                          ? vehicle.notes.length > 30
                            ? `${vehicle.notes.substring(0, 30)}...`
                            : vehicle.notes
                          : "–"
                      }
                    />
                  </View>

                  {/* Row 5: Ubezpieczenie + Przegląd (gdy ustawione) */}
                  {(vehicle.insurance_valid_until != null ||
                    vehicle.inspection_valid_until != null) && (
                    <View style={styles.detailsRow}>
                      {vehicle.insurance_valid_until != null && (
                        <DetailItem
                          icon={
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={detailIconSize}
                              color={theme.colors.accent}
                            />
                          }
                          label={t("manageVehicle.insuranceLabel")}
                          value={vehicle.insurance_valid_until}
                        />
                      )}
                      {vehicle.inspection_valid_until != null && (
                        <DetailItem
                          icon={
                            <Ionicons
                              name="checkmark-done-outline"
                              size={detailIconSize}
                              color={theme.colors.accent}
                            />
                          }
                          label={t("manageVehicle.inspectionLabel")}
                          value={vehicle.inspection_valid_until}
                        />
                      )}
                    </View>
                  )}
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
                    <Ionicons
                      name="close"
                      size={theme.icons.headerButton}
                      color="#FFFFFF"
                    />
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
        </NativeHeaderScrollView>
      </FormScreen>
    </HeaderLayout>
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
    scrollContent: {
      paddingTop: 0,
    },
    contentSection: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
    vehicleImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
      overflow: "hidden",
      borderBottomLeftRadius: theme.radius.xl,
      borderBottomRightRadius: theme.radius.xl,
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
    detailsTitle: {
      fontSize: theme.typography.largeTitle,
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
    detailsGrid: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xl,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      alignItems: "flex-start",
    },
    detailsColumn: {
      flex: 1,
      minWidth: 0, // Allows flex items to shrink below their content size
    },
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minWidth: 0, // Allows flex items to shrink below their content size
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
