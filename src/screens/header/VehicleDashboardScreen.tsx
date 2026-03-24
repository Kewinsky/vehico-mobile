import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Database, Fuel, Hash, CalendarCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import Animated, {
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

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
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { Tile as TileCard } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { WheelsIcon } from "../../ui/components/icons/WheelsIcon";
import { DashboardFab } from "../../ui/components/common/DashboardFab";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { DriveTypeIcon } from "../../ui/components/icons/DriveTypeIcon";
import { StatisticsScreen } from "./StatisticsScreen";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

/** Set to true to show the floating action button (add service/fuel/reminder). */
const SHOW_DASHBOARD_FAB = false;

type DashboardTile = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: any;
  onPhotoPress?: (index: number) => void;
};

type PagerDotProps = {
  pageIndex: number;
  onPress: () => void;
  progress: SharedValue<number>;
  theme: any;
};

function PagerDot({ pageIndex, onPress, progress, theme }: PagerDotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: 8 + 12 * Math.max(0, 1 - Math.abs(progress.value - pageIndex)),
    opacity: 0.7 + 0.3 * Math.max(0, 1 - Math.abs(progress.value - pageIndex)),
    backgroundColor: interpolateColor(
      Math.max(0, 1 - Math.abs(progress.value - pageIndex)),
      [0, 1],
      [theme.colors.border, theme.colors.accent],
    ),
    transform: [
      {
        scale: 1 + 0.08 * Math.max(0, 1 - Math.abs(progress.value - pageIndex)),
      },
    ],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[stylesInline.pagerDot, animatedStyle]} />
    </Pressable>
  );
}

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
              style={stylesInline.paginationOverlay(theme)}
              pointerEvents="none"
            >
              <Pagination.Basic
                progress={progress}
                data={photoUrls.map((url) => ({ url }))}
                dotStyle={stylesInline.paginationDot}
                activeDotStyle={stylesInline.activePaginationDot(theme)}
                containerStyle={{ gap: 5 }}
              />
            </View>
            <Pressable
              style={stylesInline.expandButton(theme)}
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
  const styles = makeStyles(theme, { bottom: 0 });
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

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { vehicleId } = route.params;
  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const pagerRef = useRef<FlatList<number>>(null);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const pagerProgress = useSharedValue(1);
  const detailIconSize = 28;
  const distanceUnit = settings?.distanceUnit ?? "km";
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const [v, photos] = await Promise.all([
          getVehicle(vehicleId),
          listVehiclePhotos(vehicleId),
        ]);
        setVehicle(v);
        setPhotoUrls(photos.map((photo) => getVehiclePhotoUrl(photo)));
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    beforeFocusReload: refreshEntitlements,
    onFocusReload: () => load({ showLoading: false }),
  });

  async function onCopyVin() {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("manageVehicle.vinCopied"));
    }
  }

  function handleSharePress() {
    if (isPremium) {
      navigation.navigate("Share", { vehicleId });
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("limits.premiumRequiredBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("limits.upgradeToPremium"),
          onPress: () => navigation.navigate("Shop"),
        },
      ],
    );
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

  const tiles: DashboardTile[] = [
    {
      key: "service",
      title: t("dashboard.tiles.serviceTitle"),
      icon: "construct",
      onPress: () => navigation.navigate("ServiceHistory", { vehicleId }),
    },
    {
      key: "docs",
      title: t("dashboard.tiles.docsTitle"),
      icon: "document-text",
      onPress: () => navigation.navigate("Documents", { vehicleId }),
    },
    {
      key: "fuel",
      title: t("dashboard.tiles.fuelTitle"),
      icon: "flash",
      onPress: () => navigation.navigate("Fuel", { vehicleId }),
    },
    {
      key: "reminders",
      title: t("dashboard.tiles.remindersTitle"),
      icon: "notifications",
      onPress: () => navigation.navigate("Reminders", { vehicleId }),
    },
    {
      key: "wheels",
      title: t("dashboard.tiles.wheelsTitle"),
      icon: "disc",
      onPress: () => navigation.navigate("Wheels", { vehicleId }),
    },
    {
      key: "workshops",
      title: t("dashboard.tiles.workshopsTitle"),
      icon: "business",
      onPress: () => navigation.navigate("Workshops"),
    },
    {
      key: "share",
      title: t("dashboard.tiles.shareTitle"),
      icon: "share-social",
      onPress: handleSharePress,
    },
    {
      key: "data",
      title: t("dashboard.tiles.dataTitle"),
      icon: "download",
      onPress: () => navigation.navigate("DataPortability", { vehicleId }),
    },
  ];

  const pageData = [0, 1, 2];

  const technicalDataPage = (
    <View style={[styles.page, { width: windowWidth }]}>
      <Text style={styles.title}>
        {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
      </Text>
      {vehicle?.vin && (
        <Pressable onPress={onCopyVin} style={styles.vinRow} hitSlop={10}>
          <Text style={styles.vinText}>{vehicle.vin}</Text>
          <Ionicons name="copy-outline" size={16} color={theme.colors.muted} />
        </Pressable>
      )}
      <View style={styles.detailsGrid}>
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
            value={vehicle ? String(vehicle.production_year) : "—"}
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
              vehicle?.mileage
                ? `${vehicle.mileage.toLocaleString()} ${distanceUnit}`
                : "—"
            }
          />
        </View>
        <View style={styles.detailsRow}>
          <DetailItem
            icon={
              <CalendarCheck
                size={detailIconSize}
                color={theme.colors.accent}
              />
            }
            label={t("vehicleForm.firstRegistrationDateLabel")}
            value={vehicle?.first_registration_date ?? "—"}
          />
          <DetailItem
            icon={<Hash size={detailIconSize} color={theme.colors.accent} />}
            label={t("vehicleForm.licensePlateLabel")}
            value={vehicle?.license_plate ?? "—"}
          />
        </View>
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
              vehicle?.engine_capacity ? `${vehicle.engine_capacity} cm³` : "—"
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
            value={vehicle?.power_hp ? `${vehicle.power_hp} HP` : "—"}
          />
        </View>
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
              vehicle?.transmission
                ? t(
                    `vehicleForm.transmission${
                      vehicle.transmission.charAt(0).toUpperCase() +
                      vehicle.transmission.slice(1)
                    }` as
                      | "vehicleForm.transmissionManual"
                      | "vehicleForm.transmissionAutomatic",
                  )
                : "—"
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
            value={vehicle?.drive_type || "—"}
          />
        </View>
        <View style={styles.detailsRow}>
          <DetailItem
            icon={
              <Ionicons
                name="water-outline"
                size={detailIconSize}
                color={theme.colors.accent}
              />
            }
            label={t("vehicleForm.fuelTypeLabel")}
            value={
              vehicle?.fuel_type
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
                : "—"
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
              vehicle?.notes
                ? vehicle.notes.length > 30
                  ? `${vehicle.notes.substring(0, 30)}...`
                  : vehicle.notes
                : "—"
            }
          />
        </View>
        {(vehicle?.insurance_valid_until != null ||
          vehicle?.inspection_valid_until != null) && (
          <View style={styles.detailsRow}>
            <DetailItem
              icon={
                <Ionicons
                  name="shield-checkmark-outline"
                  size={detailIconSize}
                  color={theme.colors.accent}
                />
              }
              label={t("manageVehicle.insuranceLabel")}
              value={vehicle?.insurance_valid_until ?? "—"}
            />
            <DetailItem
              icon={
                <Ionicons
                  name="checkmark-done-outline"
                  size={detailIconSize}
                  color={theme.colors.accent}
                />
              }
              label={t("manageVehicle.inspectionLabel")}
              value={vehicle?.inspection_valid_until ?? "—"}
            />
          </View>
        )}
      </View>
    </View>
  );

  const buttonsPage = (
    <View style={[styles.page, { width: windowWidth }]}>
      <View style={styles.tilesWrap}>
        {tiles.map((item) => (
          <View key={item.key} style={styles.tileWrapper}>
            <TileCard
              onPress={item.onPress}
              minHeight={110}
              title={item.title}
              icon={
                item.key === "fuel" ? (
                  <Fuel size={32} color={theme.colors.accent} />
                ) : item.key === "data" ? (
                  <Database size={32} color={theme.colors.accent} />
                ) : item.key === "wheels" ? (
                  <WheelsIcon size={48} color={theme.colors.accent} />
                ) : (
                  <Ionicons
                    name={item.icon}
                    size={32}
                    color={theme.colors.accent}
                  />
                )
              }
            />
          </View>
        ))}
      </View>
    </View>
  );

  const statsPage = (
    <View style={[styles.page, { width: windowWidth }]}>
      <StatisticsScreen embedded vehicleId={vehicleId} />
    </View>
  );

  const pages = [technicalDataPage, buttonsPage, statsPage];

  const headerRight = (
    <HeaderButton
      onPress={openActions}
      tintColor={theme.colors.fg}
      accessibilityLabel={undefined}
    >
      <Ionicons
        name="ellipsis-horizontal"
        size={theme.icons.headerButton}
        color={theme.colors.accent}
      />
    </HeaderButton>
  );

  const handleAddService = useCallback(() => {
    navigation.navigate("ServiceEntryForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleAddFuel = useCallback(() => {
    navigation.navigate("FuelingEntryForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleAddReminder = useCallback(() => {
    if (!isPremium && freePlanVehicleId === vehicleId) {
      const visibleCount = freePlanReminderIds?.length ?? 0;
      if (visibleCount >= remindersLimit) {
        Alert.alert(
          t("limits.reminderLimitReachedTitle"),
          t("limits.reminderLimitReachedBody", { limit: remindersLimit }),
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
    }
    navigation.navigate("ReminderForm", { vehicleId });
  }, [
    navigation,
    vehicleId,
    isPremium,
    freePlanVehicleId,
    freePlanReminderIds,
    remindersLimit,
    t,
  ]);

  useEffect(() => {
    if (activePage <= 1 && scrollOffsetYRef.current > 4) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activePage]);

  const handlePagerScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      pagerProgress.value = event.contentOffset.x / windowWidth;
    },
  });

  return (
    <HeaderLayout
      loading={loading}
      onBack={() => navigation.goBack()}
      showShopIcon={!isPremium}
      right={headerRight}
      paddingHorizontal={false}
    >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[styles.vehicleImageContainer, { height: vehicleImageHeight }]}
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
                name={vehicle?.type === "car" ? "car-outline" : "motorbike"}
                size={theme.spacing.xl * 2}
                color={theme.colors.muted}
              />
            </View>
          )}
        </View>

        <Animated.FlatList
          ref={pagerRef}
          data={pageData}
          initialScrollIndex={1}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `page-${item}`}
          getItemLayout={(_, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          onScroll={handlePagerScroll}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / windowWidth,
            );
            setActivePage(index);
          }}
          renderItem={({ index }) => pages[index]}
        />
      </ScrollView>

      <View style={styles.pagerDotsContainer} pointerEvents="box-none">
        <View style={styles.pagerDots}>
          {pageData.map((pageIndex) => (
            <PagerDot
              key={`dot-${pageIndex}`}
              pageIndex={pageIndex}
              onPress={() => {
                pagerRef.current?.scrollToIndex({
                  index: pageIndex,
                  animated: true,
                });
                setActivePage(pageIndex);
              }}
              progress={pagerProgress}
              theme={theme}
            />
          ))}
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

      {SHOW_DASHBOARD_FAB && (
        <DashboardFab
          onAddService={handleAddService}
          onAddFuel={handleAddFuel}
          onAddReminder={handleAddReminder}
        />
      )}
    </HeaderLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.bold,
      paddingRight: theme.spacing.xs,
    },
    scrollContent: {
      paddingBottom: Math.max(
        theme.spacing.xl * 3,
        insets.bottom + theme.spacing.xl * 2,
      ),
    },
    vehicleImageContainer: {
      position: "relative",
      overflow: "hidden",
      borderBottomLeftRadius: theme.radius.lg,
      borderBottomRightRadius: theme.radius.lg,
    },
    vehicleImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    page: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
    pageContent: {},
    pageTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pageSubTitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
    },
    detailsGrid: {
      gap: theme.spacing.lg,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      alignItems: "flex-start",
    },
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minWidth: 0,
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
    tilesWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    tileWrapper: {
      width: "48%",
    },
    statsGrid: {
      gap: theme.spacing.sm,
    },
    statCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs / 2,
    },
    statLabel: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statValue: {
      color: theme.colors.fg,
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pagerDotsContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: insets.bottom,
      alignItems: "center",
      zIndex: 20,
      pointerEvents: "box-none",
    },
    pagerDots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor: `${theme.colors.card}E6`,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 4,
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

const stylesInline = {
  paginationOverlay: (theme: any) => ({
    position: "absolute" as const,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    zIndex: 10,
  }),
  paginationDot: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 50,
  },
  activePaginationDot: (theme: any) => ({
    backgroundColor: theme.colors.accent,
    borderRadius: 50,
  }),
  pagerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  expandButton: (theme: any) => ({
    position: "absolute" as const,
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }),
};
