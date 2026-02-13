import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle } from "../types/domain";
import { listVehicles } from "../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../services/vehicles/uploadPhoto";
import { Alert } from "react-native";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { AppHeader } from "../ui/components/AppHeader";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../app/providers/AuthProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { normalizeDisplayName } from "../utils/displayName";
import { hexToRgba } from "../ui/components/ChoiceChip";

type Props = NativeStackScreenProps<AppStackParamList, "Vehicles">;

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
  progress: ReturnType<typeof useSharedValue<number>>;
};

function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
  progress,
}: VehicleCarouselProps) {
  if (photoUrls.length === 0) return null;

  return (
    <View style={{ position: "relative", width, height, overflow: "hidden" }}>
      <Carousel
        loop={true}
        snapEnabled={true}
        pagingEnabled={true}
        data={photoUrls}
        width={width}
        height={height}
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
            backgroundColor: "rgba(0,0,0,0.65)",
            zIndex: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <Ionicons
            name="lock-closed"
            size={48}
            color={hexToRgba(theme.colors.accent, 0.7)}
          />
        </View>
      )}
      <VehicleCarousel
        photoUrls={photoUrls}
        width={carouselWidth}
        height={220}
        theme={theme}
        progress={progress}
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
            ? ` · ${item.power_hp}${i18n.language === "pl" ? "KM" : "HP"}`
            : ""}
          {item.mileage ? ` · ${formatMileage(item.mileage)}` : ""}
        </Text>
      </View>
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
    </>
  );
}

function getFirstName(fullName: string | null | undefined): string {
  const name = fullName?.trim();
  if (!name) return "";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
}

/** Returns "morning" | "afternoon" | "evening" based on current hour (local time). */
function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function VehiclesScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [items, setItems] = useState<Vehicle[]>([]);
  const [photoUrlsMap, setPhotoUrlsMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const windowWidth = Dimensions.get("window").width;
  const { settings } = useUserSettings();
  const {
    isPremium,
    vehiclesLimit,
    photosPerVehicleLimit,
    freePlanVehicleId,
    setFreePlanVehicleId,
    daysUntilHiddenDataDeletion,
    isLoading: entitlementsLoading,
  } = useEntitlements();
  const distanceUnit = settings?.distanceUnit ?? "km";

  const visibleVehicleId: string | null = isPremium
    ? null
    : (freePlanVehicleId ??
      (items.length === 1 ? (items[0]?.id ?? null) : null));
  const showFreePlanPicker =
    !entitlementsLoading &&
    !isPremium &&
    !freePlanVehicleId &&
    items.length >= 2;
  const hasShownPickerRef = useRef(false);

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
  const timeOfDay = getTimeOfDay();
  const greetingKey =
    timeOfDay === "morning"
      ? "vehicles.greetingMorning"
      : timeOfDay === "afternoon"
        ? "vehicles.greetingAfternoon"
        : "vehicles.greetingEvening";
  const headerTitle = firstName
    ? t(greetingKey, { name: firstName })
    : t("vehicles.title");

  // Convert mileage from km to miles if needed
  const formatMileage = (mileage: number | null | undefined): string => {
    if (!mileage) return "";
    const value =
      distanceUnit === "miles" ? Math.round(mileage * 0.621371) : mileage;
    return `${value.toLocaleString()} ${
      distanceUnit === "km" ? "km" : "miles"
    }`;
  };

  const load = useCallback(
    async (opts?: { refreshing?: boolean; showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(true);
          else setLoading(true);
        }
        const data = await listVehicles();
        setItems(data);

        // Load all photos for each vehicle
        const urlsMap = new Map<string, string[]>();
        await Promise.all(
          data.map(async (vehicle) => {
            try {
              const photos = await listVehiclePhotos(
                vehicle.id,
                isPremium ? undefined : { limit: photosPerVehicleLimit },
              );
              const urls = photos.map((photo) => getVehiclePhotoUrl(photo));
              if (urls.length > 0) {
                urlsMap.set(vehicle.id, urls);
              }
            } catch (error) {
              console.error(
                `Failed to load photos for vehicle ${vehicle.id}:`,
                error,
              );
            }
          }),
        );
        setPhotoUrlsMap(urlsMap);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (opts?.showLoading !== false) {
          if (opts?.refreshing) setRefreshing(false);
          else setLoading(false);
        }
      }
    },
    [t, isPremium, photosPerVehicleLimit],
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

  useEffect(() => {
    if (!showFreePlanPicker || items.length < 2) {
      hasShownPickerRef.current = false;
      return;
    }
    if (hasShownPickerRef.current) return;
    hasShownPickerRef.current = true;
    const vehicleButtons = items.map((item) => ({
      text: `${item.make} ${item.model}${item.production_year ? ` (${item.production_year})` : ""}`,
      onPress: () => setFreePlanVehicleId(item.id),
    }));
    Alert.alert(
      t("vehicles.freePlanPickerTitle"),
      t("vehicles.freePlanPickerBody"),
      vehicleButtons,
    );
  }, [showFreePlanPicker, items, t, setFreePlanVehicleId]);

  const handleLockedVehiclePress = () => {
    const days = daysUntilHiddenDataDeletion ?? 0;
    Alert.alert(
      t("vehicles.lockedVehicleAlertTitle"),
      t("vehicles.lockedVehicleAlertBody", { days }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("vehicles.lockedVehicleAlertCTA"),
          onPress: () => navigation.navigate("Shop"),
        },
      ],
    );
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
    navigation.navigate("VehicleForm", {});
  };

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          title={headerTitle}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
      footer={
        <Button onPress={handleAddVehicle}>{t("vehicles.addVehicle")}</Button>
      }
    >
      <View style={styles.body}>
        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t("vehicles.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("vehicles.emptyBody")}</Text>
          </View>
        ) : (
          <FlatList
            data={sortedItems}
            keyExtractor={(v) => v.id}
            contentContainerStyle={styles.list}
            refreshing={refreshing}
            onRefresh={() => void load({ refreshing: true })}
            ItemSeparatorComponent={() => (
              <View style={{ height: theme.spacing.md }} />
            )}
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
                      const carouselWidth =
                        windowWidth -
                        (theme.layout?.contentPaddingHorizontal ??
                          theme.spacing.md) *
                          2;

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
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  zIndex: 5,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                pointerEvents="none"
                              >
                                <Ionicons
                                  name="lock-closed"
                                  size={48}
                                  color="rgba(255,255,255,0.9)"
                                />
                              </View>
                            )}
                            <View style={styles.vehicleImagePlaceholder}>
                              <Text style={styles.vehicleImagePlaceholderText}>
                                {item.type === "car" ? "🚗" : "🏍️"}
                              </Text>
                            </View>
                            <View style={styles.vehicleImageContent}>
                              <Text
                                style={[
                                  styles.vehicleTitle,
                                  styles.vehicleTitleOverlay,
                                ]}
                                numberOfLines={2}
                              >
                                {`${item.make} ${item.model}`}
                              </Text>
                              <Text
                                style={[
                                  styles.vehicleMeta,
                                  styles.vehicleMetaOverlay,
                                ]}
                                numberOfLines={1}
                              >
                                {item.production_year}
                                {item.power_hp
                                  ? ` · ${item.power_hp}${
                                      i18n.language === "pl" ? "KM" : "HP"
                                    }`
                                  : ""}
                                {item.mileage
                                  ? ` · ${formatMileage(item.mileage)}`
                                  : ""}
                              </Text>
                            </View>
                          </>
                        );
                      }

                      return (
                        <VehicleCardImage
                          item={item}
                          photoUrls={photoUrls}
                          carouselWidth={carouselWidth}
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
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    body: {
      flex: 1,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    emptyContainer: {
      gap: theme.spacing.xs / 2,
    },
    emptyTitle: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      color: theme.colors.muted,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    list: {
      paddingBottom:
        insets.bottom + theme.spacing.md * 2 + 52 /* footer button + padding */,
    },
    vehicleCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,

      elevation: 4,
    },
    vehicleCardPressed: {
      opacity: 0.95,
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
      fontSize: theme.typography.title,
    },
    vehicleImageContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.sm + 4,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    vehicleTitle: {
      fontSize: theme.typography.title,
      fontWeight: "800",
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
