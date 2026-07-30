import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useHeaderHeight } from "@react-navigation/elements";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { Vehicle } from "../../types/domain";
import { purgeOrphanLocalVehicleData } from "../../services/localStorage/purgeOrphanLocalVehicleData";
import { listVehicles } from "../../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotosForVehicles,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import { Button } from "../../ui/components/common/Button";
import { EmptyState } from "../../ui/components/common/EmptyState";
import { useTheme } from "../../ui/ThemeProvider";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../app/providers/AuthProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { normalizeDisplayName } from "../../utils/displayName";
import { groupThousands } from "../../utils/numberFormatting";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { WelcomeHeaderLayout } from "../../layouts";
import { CustomFlatList } from "../../ui/components/list/CustomFlatList";
import { Glow } from "../../ui/components/dashboard/Glow";
import {
  getPremiumUpgradeAlertButtons,
  showPremiumRequiredAlert,
} from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "Vehicles">;

const VEHICLE_IMAGE_HEIGHT = 220;

const VEHICLES_GLOW_ANGLE = 135;

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
  progress: ReturnType<typeof useSharedValue<number>>;
  isLocked?: boolean;
};

function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
  progress,
  isLocked = false,
}: VehicleCarouselProps) {
  if (photoUrls.length === 0) return null;

  return (
    <View style={{ position: "relative", width, height, overflow: "hidden" }}>
      <Carousel
        enabled={!isLocked}
        loop={true}
        snapEnabled={true}
        pagingEnabled={true}
        data={photoUrls}
        width={width}
        height={height}
        onConfigurePanGesture={(pan) => {
          pan.activeOffsetX([-12, 12]).failOffsetY([-15, 15]);
        }}
        onProgressChange={(_offset, absoluteProgress) => {
          progress.value = absoluteProgress;
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
    </View>
  );
}

type VehicleCardImageProps = {
  item: Vehicle;
  photoUrls: string[];
  carouselWidth: number;
  theme: any;
  styles: ReturnType<typeof makeStyles>;
  formatMileage: (m: number | null | undefined) => string;
  i18n: { language: string };
  /** When true, show blurred/locked overlay. */
  isLocked?: boolean;
};

function VehicleImageTextOverlay({
  item,
  styles,
  formatMileage,
  i18n,
}: {
  item: Vehicle;
  styles: ReturnType<typeof makeStyles>;
  formatMileage: (m: number | null | undefined) => string;
  i18n: { language: string };
}) {
  const { mode } = useTheme();

  return (
    <View style={styles.vehicleImageTint} pointerEvents="none">
      <MaskedView
        style={styles.vehicleImageTintMask}
        maskElement={
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)", "black"]}
            locations={[0, 0.42, 0.88]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView
          intensity={mode === "dark" ? 48 : 64}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.38)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.vehicleImageContent}>
        <Text
          style={[styles.vehicleTitle, styles.vehicleTitleOverlay]}
          numberOfLines={2}
        >
          {`${item.make} ${item.model}`}
        </Text>
        <Text
          style={[styles.vehicleMeta, styles.vehicleMetaOverlay]}
          numberOfLines={1}
        >
          {item.production_year}
          {item.power_hp
            ? ` · ${item.power_hp} ${i18n.language === "pl" ? "KM" : "HP"}`
            : ""}
          {item.mileage ? ` · ${formatMileage(item.mileage)}` : ""}
        </Text>
      </View>
    </View>
  );
}

function VehicleCardImage({
  item,
  photoUrls,
  carouselWidth,
  theme,
  styles,
  formatMileage,
  i18n,
  isLocked = false,
}: VehicleCardImageProps) {
  const progress = useSharedValue(0);

  return (
    <>
      {isLocked && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <BlurView
            intensity={60}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
          <Ionicons
            name="lock-closed"
            size={48}
            color={hexToRgba(theme.colors.accent, 0.5)}
          />
        </View>
      )}
      <VehicleCarousel
        photoUrls={photoUrls}
        width={carouselWidth}
        height={220}
        theme={theme}
        progress={progress}
        isLocked={isLocked}
      />
      <VehicleImageTextOverlay
        item={item}
        styles={styles}
        formatMileage={formatMileage}
        i18n={i18n}
      />
      {photoUrls.length > 1 && !isLocked && (
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
              borderRadius: 999,
            }}
            activeDotStyle={{
              backgroundColor: theme.colors.accent,
              borderRadius: 999,
            }}
            containerStyle={{ gap: 5 }}
          />
        </View>
      )}
    </>
  );
}

function getFirstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
}

function pickDailyGreetingVariant(
  seedInput: string,
  variants: string[],
): string {
  if (variants.length === 0) return "";
  let hash = 0;
  for (let i = 0; i < seedInput.length; i += 1) {
    hash = (hash * 31 + seedInput.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % variants.length;
  return variants[idx] ?? variants[0];
}

export function VehiclesScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const isFocused = useIsFocused();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const listContentStyle = useMemo(
    () =>
      Platform.OS === "android"
        ? { paddingTop: headerHeight + theme.spacing.sm }
        : undefined,
    [headerHeight, theme.spacing.sm],
  );
  const [items, setItems] = useState<Vehicle[]>([]);
  const [photoUrlsMap, setPhotoUrlsMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialVisualReady, setInitialVisualReady] = useState(false);

  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const {
    isPremium,
    vehiclesLimit,
    photosPerVehicleLimit,
    freePlanVehicleId,
    setFreePlanVehicleId,
    daysUntilHiddenDataDeletion,
    isLoading: entitlementsLoading,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const { distanceUnitLabel } = useUnitDisplay();

  const visibleVehicleId: string | null = isPremium
    ? null
    : (freePlanVehicleId ??
      (items.length === 1 ? (items[0]?.id ?? null) : null));
  const hasShownPickerRef = useRef(false);
  const hasAutoSelectedSingleVehicleRef = useRef(false);

  const sortedItems = useMemo(() => {
    if (!visibleVehicleId) return items;
    const idx = items.findIndex((v) => v.id === visibleVehicleId);
    if (idx <= 0) return items;
    const copy = [...items];
    const [selected] = copy.splice(idx, 1);
    return [selected, ...copy];
  }, [items, visibleVehicleId]);

  const normalizedName = normalizeDisplayName(
    user?.user_metadata?.full_name as string | undefined,
  );
  const firstName = getFirstName(normalizedName);

  const headerGreetingVariants = useMemo(() => {
    const raw = t("vehicles.headerGreetingVariants", {
      returnObjects: true,
    }) as unknown;
    if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
      return raw as string[];
    }
    return ["Hi", "Hello", "Hey", "Welcome", "Good to see you", "Let's go"];
  }, [t]);

  const headerGreeting = useMemo(() => {
    // Stable per day for a given user (changes once daily).
    const today = new Date().toISOString().slice(0, 10);
    const userSeed = user?.id ?? "anonymous";
    return pickDailyGreetingVariant(
      `${userSeed}:${today}`,
      headerGreetingVariants,
    );
  }, [user?.id, headerGreetingVariants]);
  const headerTitle = firstName
    ? `${headerGreeting}, ${firstName}!`
    : `${headerGreeting}!`;

  const formatMileage = (mileage: number | null | undefined): string => {
    if (!mileage) return "";
    return `${groupThousands(mileage, 0, i18n.language)} ${distanceUnitLabel}`;
  };

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      const shouldShowLoading = opts?.showLoading !== false;
      try {
        if (shouldShowLoading) {
          setInitialVisualReady(false);
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const data = await listVehicles();
        setItems(data);

        void purgeOrphanLocalVehicleData(data.map((v) => v.id)).catch((err) => {
          console.warn("purgeOrphanLocalVehicleData failed", err);
        });

        // Load photos for all vehicles in a single query to avoid N+1 requests.
        const photosByVehicle = await listVehiclePhotosForVehicles(
          data.map((v) => v.id),
          isPremium ? undefined : { limit: photosPerVehicleLimit },
        );
        const urlsMap = new Map<string, string[]>();
        for (const vehicle of data) {
          const photos = photosByVehicle.get(vehicle.id) ?? [];
          const urls = photos.map((photo) => getVehiclePhotoUrl(photo));
          if (urls.length > 0) urlsMap.set(vehicle.id, urls);
        }
        setPhotoUrlsMap(urlsMap);

        if (shouldShowLoading) {
          const allPhotoUrls = Array.from(urlsMap.values()).flat();
          const uniquePhotoUrls = Array.from(new Set(allPhotoUrls));
          if (uniquePhotoUrls.length > 0) {
            try {
              await Image.prefetch(uniquePhotoUrls);
            } catch {
              // Don't block screen on photo prefetch failures.
            }
          }
          setInitialVisualReady(true);
        }
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
        if (shouldShowLoading) setInitialVisualReady(true);
      } finally {
        if (shouldShowLoading) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [t, isPremium, photosPerVehicleLimit],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
    deferFocusReload: true,
  });

  useEffect(() => {
    if (
      entitlementsLoading ||
      isPremium ||
      freePlanVehicleId ||
      items.length !== 1
    ) {
      hasAutoSelectedSingleVehicleRef.current = false;
      return;
    }
    if (hasAutoSelectedSingleVehicleRef.current) return;
    hasAutoSelectedSingleVehicleRef.current = true;
    void setFreePlanVehicleId(items[0].id).catch((error) => {
      hasAutoSelectedSingleVehicleRef.current = false;
      console.error("Failed to auto-select free plan vehicle:", error);
    });
  }, [
    entitlementsLoading,
    isPremium,
    freePlanVehicleId,
    items,
    setFreePlanVehicleId,
  ]);

  useEffect(() => {
    if (isPremium || freePlanVehicleId != null) {
      hasShownPickerRef.current = false;
      return;
    }
    if (!isFocused || items.length < 2) return;
    if (entitlementsLoading) return;

    const fromDowngradeParam = route.params?.showVehiclePicker === true;
    const needPicker = fromDowngradeParam || !freePlanVehicleId;
    if (!needPicker) return;

    if (hasShownPickerRef.current) return;
    hasShownPickerRef.current = true;

    if (fromDowngradeParam) {
      navigation.setParams({ showVehiclePicker: false });
    }
    const vehicleButtons = items.map((item) => ({
      text: `${item.make} ${item.model}${item.production_year ? ` (${item.production_year})` : ""}`,
      onPress: () => setFreePlanVehicleId(item.id),
    }));
    Alert.alert(
      t("vehicles.freePlanPickerTitle"),
      t("vehicles.freePlanPickerBody"),
      vehicleButtons,
    );
  }, [
    isFocused,
    items,
    t,
    setFreePlanVehicleId,
    navigation,
    route.params?.showVehiclePicker,
    isPremium,
    freePlanVehicleId,
    entitlementsLoading,
  ]);

  const handleLockedVehiclePress = () => {
    const days = daysUntilHiddenDataDeletion ?? 0;
    showPremiumRequiredAlert(t, navigation, {
      title: t("vehicles.lockedVehicleAlertTitle"),
      message: t("vehicles.lockedVehicleAlertBody", { days }),
    });
  };

  const handleAddVehicle = () => {
    if (isPremium) {
      navigation.navigate("VehicleForm", {});
      return;
    }
    if (items.length >= vehiclesLimit) {
      Alert.alert(
        t("limits.vehicleLimitReachedTitle"),
        t("limits.vehicleLimitReachedBody", { limit: vehiclesLimit }),
        getPremiumUpgradeAlertButtons(t, navigation),
      );
      return;
    }
    navigation.navigate("VehicleForm", {});
  };

  return (
    <WelcomeHeaderLayout
      title={headerTitle}
      showProfileAvatar
      showShopIcon={!isPremium}
      loading={loading}
      ready={initialVisualReady}
      background={
        <Glow
          width={windowWidth}
          height={Math.round(windowHeight * 0.275)}
          mode={mode}
          variant="irregular"
          irregularOrigin="top-right"
          angle={VEHICLES_GLOW_ANGLE}
          scale={2}
          style={styles.backgroundGlow}
        />
      }
      footer={
        <Button onPress={handleAddVehicle}>{t("vehicles.addVehicle")}</Button>
      }
    >
      <CustomFlatList
        data={sortedItems}
        keyExtractor={(v) => v.id}
        refreshing={refreshing}
        onRefresh={() => void load({ refreshing: true })}
        nestedScrollEnabled={true}
        contentContainerStyle={listContentStyle}
        ListEmptyComponent={<EmptyState body={t("vehicles.emptyTitle")} />}
        renderItem={({ item }) => {
          const isLocked =
            !isPremium &&
            (visibleVehicleId == null || item.id !== visibleVehicleId);
          return (
            <Pressable
              onPress={() => {
                if (isLocked) {
                  handleLockedVehiclePress();
                  return;
                }
                navigation.navigate("VehicleDashboard", {
                  vehicleId: item.id,
                  screen: "Overview",
                });
              }}
              style={({ pressed }) => [
                styles.vehicleCard,
                pressed && styles.vehicleCardPressed,
              ]}
            >
              <View style={styles.vehicleImageContainer}>
                {(() => {
                  const photoUrls = photoUrlsMap.get(item.id) || [];

                  if (photoUrls.length === 0) {
                    return (
                      <>
                        {isLocked && (
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 5,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            pointerEvents="none"
                          >
                            <BlurView
                              intensity={60}
                              tint="dark"
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                              }}
                            />
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0,0,0,0.35)",
                              }}
                            />
                            <Ionicons
                              name="lock-closed"
                              size={48}
                              color="rgba(255,255,255,0.9)"
                            />
                          </View>
                        )}
                        <View style={styles.vehicleImagePlaceholder}>
                          <MaterialCommunityIcons
                            name={
                              item.type === "car" ? "car-outline" : "motorbike"
                            }
                            size={theme.spacing.xl * 2}
                            color={theme.colors.muted}
                          />
                        </View>
                        <VehicleImageTextOverlay
                          item={item}
                          styles={styles}
                          formatMileage={formatMileage}
                          i18n={i18n}
                        />
                      </>
                    );
                  }

                  return (
                    <VehicleCardImage
                      item={item}
                      photoUrls={photoUrls}
                      carouselWidth={windowWidth}
                      theme={theme}
                      styles={styles}
                      formatMileage={formatMileage}
                      i18n={i18n}
                      isLocked={isLocked}
                    />
                  );
                })()}
              </View>
            </Pressable>
          );
        }}
      />
    </WelcomeHeaderLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    body: {
      flex: 1,
    },
    backgroundGlow: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    vehicleCard: {
      borderRadius: theme.radius.xl,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      elevation: 4,
    },
    vehicleCardPressed: {
      opacity: 0.95,
    },
    vehicleImageContainer: {
      position: "relative",
      height: VEHICLE_IMAGE_HEIGHT,
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
    vehicleImageTint: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 148,
      justifyContent: "flex-end",
    },
    vehicleImageTintMask: {
      ...StyleSheet.absoluteFillObject,
    },
    vehicleImageContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.sm + 4,
    },
    vehicleTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.xs / 2,
    },
    vehicleTitleOverlay: {
      color: "#fff",
    },
    vehicleMeta: {
      fontSize: theme.typography.small,
      color: theme.colors.fg,
      opacity: 0.95,
    },
    vehicleMetaOverlay: {
      color: "rgba(255,255,255,0.92)",
    },
  });
