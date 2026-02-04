import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuth } from "../app/providers/AuthProvider";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { AppHeader } from "../ui/components/AppHeader";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Vehicles">;

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
};

function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
}: VehicleCarouselProps) {
  const progress = useSharedValue(0);

  if (photoUrls.length === 0) return null;

  return (
    <View style={{ position: "relative", width, height }}>
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
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: theme.colors.card,
            }}
            contentFit="cover"
            transition={200}
          />
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
  );
}

export function VehiclesScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { signOut } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [photoUrlsMap, setPhotoUrlsMap] = useState<Map<string, string[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const windowWidth = Dimensions.get("window").width;
  const { settings } = useUserSettings();
  const distanceUnit = settings?.distanceUnit ?? "km";

  // Convert mileage from km to miles if needed
  const formatMileage = (mileage: number | null | undefined): string => {
    if (!mileage) return "";
    const value =
      distanceUnit === "miles" ? Math.round(mileage * 0.621371) : mileage;
    return `${value.toLocaleString()} ${
      distanceUnit === "km" ? "km" : "miles"
    }`;
  };

  function onSignOut() {
    signOut().catch((e: any) => {
      toastError(e?.message ?? t("common.error"));
    });
  }

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
              const photos = await listVehiclePhotos(vehicle.id);
              const urls = photos.map((photo) => getVehiclePhotoUrl(photo));
              if (urls.length > 0) {
                urlsMap.set(vehicle.id, urls);
              }
            } catch (error) {
              console.error(
                `Failed to load photos for vehicle ${vehicle.id}:`,
                error
              );
            }
          })
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
    [t]
  );

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
    return unsub;
  }, [navigation, load]);

  return (
    <Screen padding={false}>
      <AppHeader />
      <View style={styles.top}>
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate("Profile")}
            hitSlop={10}
          >
            <Text style={[styles.actionText, { color: theme.colors.accent }]}>
              {t("profile.title")}
            </Text>
          </Pressable>
          <Pressable onPress={onSignOut} hitSlop={10}>
            <Text style={[styles.actionText, { color: theme.colors.danger }]}>
              {t("common.signOut")}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t("vehicles.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("vehicles.emptyBody")}</Text>
            <View style={{ height: theme.spacing.sm }} />
            <Button onPress={() => navigation.navigate("VehicleForm")}>
              {t("vehicles.addVehicle")}
            </Button>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(v) => v.id}
              contentContainerStyle={styles.list}
              refreshing={refreshing}
              onRefresh={() => void load({ refreshing: true })}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    navigation.navigate("MainTabs", {
                      screen: "Dashboard",
                      params: {
                        screen: "VehicleDashboard",
                        params: { vehicleId: item.id },
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.vehicleCard,
                    pressed && styles.vehicleCardPressed,
                  ]}
                >
                  <View style={styles.vehicleImageContainer}>
                    {(() => {
                      const photoUrls = photoUrlsMap.get(item.id) || [];
                      const carouselWidth = windowWidth - theme.spacing.md * 2;

                      if (photoUrls.length === 0) {
                        return (
                          <>
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
                        <>
                          <VehicleCarousel
                            photoUrls={photoUrls}
                            width={carouselWidth}
                            height={220}
                            theme={theme}
                          />
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
                    })()}
                  </View>
                </Pressable>
              )}
              ListFooterComponent={
                <View style={{ paddingTop: theme.spacing.sm }}>
                  <Button onPress={() => navigation.navigate("VehicleForm")}>
                    {t("vehicles.addVehicle")}
                  </Button>
                </View>
              }
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    top: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm + 2,
    },
    actionText: { fontWeight: "800", color: theme.colors.muted },
    body: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
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
      paddingBottom: insets.bottom + theme.spacing.xl,
      gap: theme.spacing.xs,
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
    pill: {
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.sm / 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    pillText: {
      fontSize: theme.typography.xs,
      fontWeight: "800",
      color: theme.colors.muted,
    },
  });
