import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
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
import {
  CalendarCheck,
  CheckCheck,
  Clock,
  Copy,
  Database,
  Fuel,
  Hash,
  Settings,
  ShieldCheck,
  Warehouse,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Font from "expo-font";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import QRCode from "react-native-qrcode-svg";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import Animated, {
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type {
  FuelingEntry,
  Reminder,
  ServiceEntry,
  Vehicle,
  VehicleTire,
  VehicleWheel,
} from "../../types/domain";
import {
  deleteVehicle,
  getVehicle,
  updateVehicle,
} from "../../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import {
  getPublicPageUrl,
  listPublicPages,
} from "../../services/publicPages/publicPagesRepo";
import {
  formatTireDimensions,
  listVehicleTires,
} from "../../services/tires/tiresRepo";
import {
  formatWheelDimensions,
  listVehicleWheels,
} from "../../services/wheels/wheelsRepo";
import { listReminders } from "../../services/reminders/remindersRepo";
import { getReminderProgressPercent } from "../../services/reminders/reminderProgress";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { Button } from "../../ui/components/common/Button";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { Tile as TileCard } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { WheelsIcon } from "../../ui/components/icons/WheelsIcon";
import { TireIcon } from "../../ui/components/icons/TireIcon";
import { RimIcon } from "../../ui/components/icons/RimIcon";
import { DashboardFab } from "../../ui/components/common/DashboardFab";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { DriveTypeIcon } from "../../ui/components/icons/DriveTypeIcon";
import { Logo } from "../../ui/components/branding/Logo";
import { ReminderItem } from "../../ui/components/list/ReminderItem";
import { StatisticsScreen } from "./StatisticsScreen";
import { formatRelativeTimePast } from "../../utils/formatRelativeTimePast";
import { isNonNegativeNumber, isValidDate } from "../../utils/validation";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { groupThousands } from "../../utils/numberFormatting";
import { ButtonsPage } from "./vehicleDashboard/pages/ButtonsPage";
import {
  formatTermsValue,
  getDaysUntilDate,
  getMileageStaleYmd,
  isReminderOverdue,
  quickMetricsWindowYmdBounds,
} from "./vehicleDashboard/domain/terms";

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

type DashboardStatTileProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconComponent?: ReactNode;
  label: string;
  valueMain: ReactNode;
  valueMainColor?: string;
  valueSuffix?: string;
  fullWidth?: boolean;
  backgroundColor?: string;
  labelColor?: string;
  iconColor?: string;
  onPress?: () => void;
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

function DashboardStatTile({
  icon,
  iconComponent,
  label,
  valueMain,
  valueMainColor,
  valueSuffix,
  fullWidth,
  backgroundColor,
  labelColor,
  iconColor,
  onPress,
}: DashboardStatTileProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme, { bottom: 0 });
  const content = (
    <View
      style={[
        styles.dashboardStatTile,
        fullWidth && styles.dashboardStatTileFullWidth,
        { backgroundColor: backgroundColor ?? theme.colors.card },
      ]}
    >
      <View style={styles.dashboardStatTileTitleRow}>
        {iconComponent ? (
          iconComponent
        ) : icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={iconColor ?? theme.colors.accent}
          />
        ) : null}
        <Text
          style={[
            styles.dashboardStatTileLabel,
            { color: labelColor ?? theme.colors.accent },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.dashboardStatTileValueRow}>
        {typeof valueMain === "string" || typeof valueMain === "number" ? (
          <Text
            style={[
              styles.dashboardStatTileValueMain,
              { color: valueMainColor ?? theme.colors.fg },
            ]}
          >
            {valueMain}
          </Text>
        ) : (
          valueMain
        )}
        {valueSuffix ? (
          <Text
            style={[
              styles.dashboardStatTileValueSuffix,
              { color: theme.colors.muted },
            ]}
          >
            {" "}
            {valueSuffix}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.dashboardStatTilePressable,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const units = useUnitDisplay();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const { vehicleId } = route.params;
  const {
    isPremium,
    remindersLimit,
    freePlanVehicleId,
    freePlanReminderIds,
    freePlanTireId,
    freePlanWheelId,
    refresh: refreshEntitlements,
  } = useEntitlements();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<VehicleTire[]>([]);
  const [wheels, setWheels] = useState<VehicleWheel[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [fuelingEntries, setFuelingEntries] = useState<FuelingEntry[]>([]);
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [publicReportUrl, setPublicReportUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const [isPublicQrVisible, setIsPublicQrVisible] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const pagerRef = useRef<FlatList<number>>(null);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const pagerProgress = useSharedValue(1);
  const detailIconSize = 28;
  const {
    distanceUnit,
    distanceUnitLabel,
    fuelUnitShort,
    consumptionUnitLine,
  } = units;
  const currency = settings?.currency ?? "PLN";
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);
  const mileageStaleYmd = useMemo(() => {
    return getMileageStaleYmd(vehicle?.mileage, vehicle?.mileage_updated_at);
  }, [vehicle?.mileage, vehicle?.mileage_updated_at]);
  const fittedTires = useMemo(
    () =>
      tires.filter((item) => {
        if (!item.is_currently_fitted) return false;
        if (isPremium) return true;
        if (freePlanVehicleId !== vehicleId) return false;
        return freePlanTireId != null && item.id === freePlanTireId;
      }),
    [tires, isPremium, freePlanVehicleId, vehicleId, freePlanTireId],
  );
  const fittedWheels = useMemo(
    () =>
      wheels.filter((item) => {
        if (!item.is_currently_fitted) return false;
        if (isPremium) return true;
        if (freePlanVehicleId !== vehicleId) return false;
        return freePlanWheelId != null && item.id === freePlanWheelId;
      }),
    [wheels, isPremium, freePlanVehicleId, vehicleId, freePlanWheelId],
  );
  const fittedTiresLines = useMemo(() => {
    if (fittedTires.length === 0) return ["—"];
    return fittedTires.map(
      (item) =>
        `${formatTireDimensions(
          item.width_mm,
          item.aspect_ratio,
          item.diameter_inch,
        )} · ${(item.name ?? "").trim() || "—"}`,
    );
  }, [fittedTires]);
  const fittedWheelsLines = useMemo(() => {
    if (fittedWheels.length === 0) return ["—"];
    return fittedWheels.map(
      (item) =>
        `${formatWheelDimensions(item.width_inch, item.diameter_inch)} · ${
          (item.name ?? "").trim() || "—"
        }`,
    );
  }, [fittedWheels]);
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const currentMileage = vehicle?.mileage ?? null;
    return reminders
      .filter((reminder) => reminder.status === "active")
      .sort((a, b) => {
        const aOverdue = isReminderOverdue(a, currentMileage);
        const bOverdue = isReminderOverdue(b, currentMileage);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        const aProgress = getReminderProgressPercent(a, currentMileage, now);
        const bProgress = getReminderProgressPercent(b, currentMileage, now);
        if (aProgress !== bProgress) return bProgress - aProgress;
        const dateA = a.due_date
          ? String(a.due_date).slice(0, 10)
          : "9999-12-31";
        const dateB = b.due_date
          ? String(b.due_date).slice(0, 10)
          : "9999-12-31";
        return dateA.localeCompare(dateB);
      })
      .slice(0, 3);
  }, [reminders, vehicle?.mileage]);
  /** Active reminders among rows returned by listReminders (respects plan limits / id list). */
  const activeRemindersCount = useMemo(
    () => reminders.filter((r) => r.status === "active").length,
    [reminders],
  );
  const insuranceDaysUntil = useMemo(
    () => getDaysUntilDate(vehicle?.insurance_valid_until),
    [vehicle?.insurance_valid_until],
  );
  const inspectionDaysUntil = useMemo(
    () => getDaysUntilDate(vehicle?.inspection_valid_until),
    [vehicle?.inspection_valid_until],
  );

  const quickMetrics = useMemo(() => {
    const { fromYmd, toYmd } = quickMetricsWindowYmdBounds();
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromYmdYear = oneYearAgo.toISOString().slice(0, 10);
    const fuelInWindow = fuelingEntries.filter((x) => {
      const d = String(x.date).slice(0, 10);
      return d >= fromYmd && d <= toYmd;
    });
    const serviceInWindow = serviceEntries.filter((x) => {
      const d = String(x.service_date).slice(0, 10);
      return d >= fromYmd && d <= toYmd;
    });
    const fuelInYearWindow = fuelingEntries.filter((x) => {
      const d = String(x.date).slice(0, 10);
      return d >= fromYmdYear && d <= toYmd;
    });
    const serviceInYearWindow = serviceEntries.filter((x) => {
      const d = String(x.service_date).slice(0, 10);
      return d >= fromYmdYear && d <= toYmd;
    });

    const distanceKmTotalForConsumption = fuelInYearWindow.reduce(
      (sum, x) => sum + Number(x.distance ?? 0),
      0,
    );
    const distanceKmTotalForDistance = fuelInWindow.reduce(
      (sum, x) => sum + Number(x.distance ?? 0),
      0,
    );
    const totalFuel = fuelInYearWindow.reduce(
      (sum, x) => sum + Number(x.fuel_amount ?? 0),
      0,
    );
    const avgConsumptionPer100 =
      distanceKmTotalForConsumption > 0
        ? (totalFuel / distanceKmTotalForConsumption) * 100
        : Number.NaN;

    const fuelCost = fuelInYearWindow.reduce(
      (sum, x) => sum + Number(x.fuel_cost ?? 0),
      0,
    );
    const serviceCost = serviceInYearWindow.reduce(
      (sum, x) => sum + Number(x.cost ?? 0),
      0,
    );
    const totalCost = fuelCost + serviceCost;

    const dates: string[] = [];
    for (const f of fuelInYearWindow) dates.push(f.date.slice(0, 10));
    for (const s of serviceInYearWindow)
      dates.push(String(s.service_date).slice(0, 10));

    let daysSpan = 1;
    if (dates.length > 0) {
      dates.sort();
      const minYmd = dates[0]!;
      const todayYmd = new Date().toISOString().slice(0, 10);
      const ms =
        new Date(`${todayYmd}T12:00:00`).getTime() -
        new Date(`${minYmd}T12:00:00`).getTime();
      daysSpan = Math.max(1, Math.ceil(ms / 86400000) + 1);
    }

    const costPerDay =
      dates.length > 0 && totalCost >= 0 ? totalCost / daysSpan : Number.NaN;

    let distanceNumber = groupThousands(0, 0, i18n.language);
    if (distanceKmTotalForDistance > 0) {
      const dist = distanceKmTotalForDistance;
      if (dist >= 1000) {
        const thousands = Math.round((dist / 1000) * 10) / 10;
        distanceNumber = groupThousands(thousands, 1, i18n.language);
      } else {
        distanceNumber = groupThousands(dist, 0, i18n.language);
      }
    }

    const consumptionSecondary = consumptionUnitLine;
    const consumptionPrimary = Number.isFinite(avgConsumptionPer100)
      ? groupThousands(avgConsumptionPer100, 1, i18n.language)
      : groupThousands(0, 0, i18n.language);

    const costRounded =
      dates.length > 0 && Number.isFinite(costPerDay)
        ? Math.round(costPerDay)
        : 0;
    const costNumber = groupThousands(costRounded, 0, i18n.language);
    const costShowCurrency = costRounded !== 0;

    const distanceShowUnit = distanceKmTotalForDistance > 0;

    return {
      consumptionPrimary,
      consumptionSecondary,
      costNumber,
      costShowCurrency,
      distanceNumber,
      distanceShowUnit,
      remindersPrimary: String(activeRemindersCount),
    };
  }, [
    fuelingEntries,
    serviceEntries,
    consumptionUnitLine,
    distanceUnitLabel,
    currency,
    activeRemindersCount,
    i18n.language,
  ]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const reminderOptions = isPremium
          ? undefined
          : freePlanVehicleId === vehicleId
            ? { freePlanReminderIds }
            : { limit: remindersLimit };
        const [
          v,
          photos,
          tiresData,
          wheelsData,
          reports,
          remindersData,
          fuelingData,
          serviceData,
        ] = await Promise.all([
          getVehicle(vehicleId),
          listVehiclePhotos(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
          isPremium ? listPublicPages(vehicleId) : Promise.resolve([]),
          listReminders(vehicleId, reminderOptions),
          listFuelingEntries(vehicleId),
          listServiceEntries(vehicleId),
        ]);
        setVehicle(v);
        setPhotoUrls(photos.map((photo) => getVehiclePhotoUrl(photo)));
        setTires(tiresData);
        setWheels(wheelsData);
        setReminders(remindersData);
        setFuelingEntries(fuelingData);
        setServiceEntries(serviceData);
        const latestReport = reports[0];
        const reportUrl = latestReport?.public_id
          ? await getPublicPageUrl(latestReport.public_id)
          : null;
        setPublicReportUrl(reportUrl);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [
      vehicleId,
      t,
      isPremium,
      freePlanVehicleId,
      freePlanReminderIds,
      remindersLimit,
    ],
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

  async function handleOpenPublicReportInBrowser() {
    if (!publicReportUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(publicReportUrl);
      if (canOpen) {
        await Linking.openURL(publicReportUrl);
      } else {
        toastError(t("share.cannotOpenUrl"));
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function handleCopyPublicReportLink() {
    if (!publicReportUrl) return;
    try {
      await Clipboard.setStringAsync(publicReportUrl);
      toastSuccess(t("share.linkCopied"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function openPublicReportShareActions() {
    if (!publicReportUrl) return;
    Alert.alert(t("share.title"), t("common.chooseOption"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("share.openInBrowser"),
        onPress: () => void handleOpenPublicReportInBrowser(),
      },
      {
        text: t("share.showQRCode"),
        onPress: () => setIsPublicQrVisible(true),
      },
      {
        text: t("share.copyLink"),
        onPress: () => void handleCopyPublicReportLink(),
      },
    ]);
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
    Alert.alert(t("dashboard.tiles.manageTitle"), t("common.chooseOption"), [
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

  const mileageStaleTitle =
    mileageStaleYmd == null
      ? null
      : t("dashboard.mileageUpdated.lastUpdated", {
          relative: formatRelativeTimePast(mileageStaleYmd, i18n.language),
        });

  const handleQuickMileageEdit = useCallback(() => {
    Alert.prompt(
      t("dashboard.mileageUpdated.cta"),
      `${t("vehicleForm.mileageLabel")} (${distanceUnitLabel})`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (value: string | undefined) => {
            const mileageRaw = (value ?? "").trim();
            if (!mileageRaw.length || !isNonNegativeNumber(mileageRaw)) {
              toastError(t("validation.nonNegativeRequired"));
              return;
            }
            try {
              const updatedVehicle = await updateVehicle(vehicleId, {
                mileage: Number(mileageRaw),
                mileage_updated_at: new Date().toISOString().slice(0, 10),
              });
              setVehicle(updatedVehicle);
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      vehicle?.mileage != null ? String(vehicle.mileage) : "",
    );
  }, [distanceUnitLabel, t, vehicle?.mileage, vehicleId]);

  const saveFormalitiesDate = useCallback(
    async (
      field: "insurance_valid_until" | "inspection_valid_until",
      value: string | null,
    ) => {
      if (value != null && value.length > 0 && !isValidDate(value)) {
        toastError(t("validation.invalidDate"));
        return;
      }
      try {
        const updatedVehicle = await updateVehicle(vehicleId, {
          [field]: value,
        });
        setVehicle(updatedVehicle);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      }
    },
    [t, vehicleId],
  );

  const openFormalitiesDateEditor = useCallback(
    (
      field: "insurance_valid_until" | "inspection_valid_until",
      currentValue: string | null | undefined,
      title: string,
      prompt: string,
    ) => {
      Alert.alert(
        title,
        t("common.chooseOption"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.edit"),
            onPress: () => {
              Alert.prompt(
                title,
                prompt,
                [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("common.save"),
                    onPress: (value: string | undefined) => {
                      const trimmed = (value ?? "").trim();
                      void saveFormalitiesDate(
                        field,
                        trimmed.length ? trimmed : null,
                      );
                    },
                  },
                ],
                "plain-text",
                currentValue?.slice(0, 10) ?? "",
              );
            },
          },
          {
            text: t("dashboard.formalitiesUpdate.clearDate"),
            style: "destructive",
            onPress: () => void saveFormalitiesDate(field, null),
          },
        ],
        { cancelable: true },
      );
    },
    [saveFormalitiesDate, t],
  );

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
      <View style={styles.vehicleHeaderRow}>
        <View style={styles.vehicleHeaderText}>
          <Text
            style={[
              styles.title,
              { paddingBottom: vehicle?.vin ? 0 : theme.spacing.md },
            ]}
          >
            {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
          </Text>
          {vehicle?.vin && (
            <Pressable onPress={onCopyVin} style={styles.vinRow} hitSlop={10}>
              <Text style={styles.vinText}>{vehicle.vin}</Text>
              <Copy size={16} color={theme.colors.muted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
        {isPremium && publicReportUrl ? (
          <Pressable
            onPress={openPublicReportShareActions}
            style={styles.publicPageCircleButton}
            hitSlop={10}
          >
            <Ionicons name="share-social" size={24} color="#000" />
          </Pressable>
        ) : null}
      </View>

      {mileageStaleTitle ? (
        <View
          style={[
            styles.mileageStaleCard,
            { backgroundColor: hexToRgba(theme.colors.accent, 0.14) },
          ]}
          accessibilityLabel={mileageStaleTitle ?? undefined}
        >
          <View style={styles.mileageStaleCardTop}>
            <Clock size={26} color={theme.colors.accent} strokeWidth={2} />
            <Text style={[styles.mileageStaleCardTitle, { color: theme.colors.fg }]}>
              {mileageStaleTitle}
            </Text>
          </View>
          <Button onPress={handleQuickMileageEdit}>
            {t("dashboard.mileageUpdated.cta")}
          </Button>
        </View>
      ) : null}
      <View style={styles.panelSections}>
        <View style={styles.sectionBlock}>
          <View
            style={[styles.quickMetricsCard, { backgroundColor: theme.colors.card }]}
          >
            <View style={styles.quickMetricsRow}>
              <View style={styles.quickMetricCell}>
                <Text
                  style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {quickMetrics.consumptionPrimary}
                </Text>
                <Text
                  style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
                  numberOfLines={2}
                >
                  {quickMetrics.consumptionSecondary}
                </Text>
              </View>
              <View style={styles.quickMetricCell}>
                <Text
                  style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {quickMetrics.costNumber}
                  {quickMetrics.costShowCurrency ? (
                    <Text
                      style={[
                        styles.quickMetricInlineUnit,
                        { color: theme.colors.muted },
                      ]}
                    >
                      {` ${currency}`}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
                  numberOfLines={2}
                >
                  {t("dashboard.quickMetrics.costSubtitle")}
                </Text>
              </View>
              <View style={styles.quickMetricCell}>
                <Text
                  style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {quickMetrics.distanceNumber}
                  {quickMetrics.distanceShowUnit ? (
                    <Text
                      style={[
                        styles.quickMetricInlineUnit,
                        { color: theme.colors.muted },
                      ]}
                    >
                      {` ${distanceUnitLabel}`}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
                  numberOfLines={2}
                >
                  {t("dashboard.quickMetrics.distanceSubtitle")}
                </Text>
              </View>
              <View style={styles.quickMetricCell}>
                <Text
                  style={[styles.quickMetricPrimary, { color: theme.colors.fg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {quickMetrics.remindersPrimary}
                </Text>
                <Text
                  style={[styles.quickMetricSecondary, { color: theme.colors.muted }]}
                  numberOfLines={2}
                >
                  {t("dashboard.quickMetrics.alertsSubtitle")}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.specification")}
          </Text>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailsRow}>
                <DetailItem
                  icon={<Ionicons name="calendar-outline" size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.yearLabel")}
                  value={vehicle ? String(vehicle.production_year) : "—"}
                />
                <DetailItem
                  icon={<Fuel size={detailIconSize} color={theme.colors.accent} />}
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
              </View>
              <View style={styles.detailsRow}>
                <DetailItem
                  icon={<MaterialCommunityIcons name="progress-clock" size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.initialMileageLabel")}
                  value={
                    vehicle?.initial_mileage != null
                      ? `${groupThousands(vehicle.initial_mileage, 0, i18n.language)} ${distanceUnitLabel}`
                      : "—"
                  }
                />
                <DetailItem
                  icon={<Ionicons name="speedometer-outline" size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.mileageLabel")}
                  value={
                    vehicle?.mileage != null
                      ? `${groupThousands(vehicle.mileage, 0, i18n.language)} ${distanceUnitLabel}`
                      : "—"
                  }
                />
              </View>
              <View style={styles.detailsRow}>
                <DetailItem
                  icon={<MaterialCommunityIcons name="engine" size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.engineCapacityLabel")}
                  value={
                    vehicle?.engine_capacity
                      ? `${groupThousands(vehicle.engine_capacity, 0, i18n.language)} cm³`
                      : "—"
                  }
                />
                <DetailItem
                  icon={<Ionicons name="flash-outline" size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.powerHpLabel")}
                  value={
                    vehicle?.power_hp
                      ? `${groupThousands(vehicle.power_hp, 0, i18n.language)} ${t("vehicleForm.powerOutputUnit")}`
                      : "—"
                  }
                />
              </View>
              <View style={styles.detailsRow}>
                <DetailItem
                  icon={<MaterialCommunityIcons name="car-shift-pattern" size={detailIconSize} color={theme.colors.accent} />}
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
                  icon={<DriveTypeIcon size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.driveTypeLabel")}
                  value={vehicle?.drive_type || "—"}
                />
              </View>
              <View style={styles.detailsRow}>
                <DetailItem
                  icon={<CalendarCheck size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.firstRegistrationDateLabel")}
                  value={formatShortDisplayDate(vehicle?.first_registration_date ?? null, i18n.language)}
                />
                <DetailItem
                  icon={<Hash size={detailIconSize} color={theme.colors.accent} />}
                  label={t("vehicleForm.licensePlateLabel")}
                  value={vehicle?.license_plate ?? "—"}
                />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.quickActionsTitle", { defaultValue: "Quick actions" })}
          </Text>
          <View style={styles.quickActionsRow}>
            <Pressable onPress={handleAddService} hitSlop={8} style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="construct" size={detailIconSize} color={theme.colors.accent} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>{t("dashboard.quickActions.addService")}</Text>
            </Pressable>
            <Pressable onPress={handleAddFuel} hitSlop={8} style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}>
              <Fuel size={detailIconSize} color={theme.colors.accent} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>{t("dashboard.quickActions.addFuel")}</Text>
            </Pressable>
            <Pressable onPress={handleAddReminder} hitSlop={8} style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="notifications" size={detailIconSize} color={theme.colors.accent} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>{t("dashboard.quickActions.addReminder")}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("reminders.tabUpcoming", { defaultValue: "Upcoming" })}
            </Text>
            <Pressable onPress={() => navigation.navigate("Reminders", { vehicleId })} hitSlop={8}>
              <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
                {t("dashboard.stats.viewAll")}
              </Text>
            </Pressable>
          </View>
          {upcomingReminders.length > 0 ? (
            <View style={styles.upcomingRemindersList}>
              {upcomingReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  title={reminder.title ?? ""}
                  createdAt={reminder.created_at}
                  dueDate={reminder.due_date}
                  dueMileage={reminder.due_mileage}
                  currentMileage={vehicle?.mileage ?? null}
                  anchorMileage={reminder.recurrence_anchor_mileage}
                  remainingDistanceLabel={t("reminders.remainingDistance")}
                  estimatedTimeLabel={t("reminders.estimatedTime")}
                  onPress={() =>
                    navigation.navigate("ReminderForm", {
                      vehicleId,
                      reminderId: reminder.id,
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.pageSubTitle, { color: theme.colors.muted }]}>
              {t("reminders.noItems")}
            </Text>
          )}
        </View>
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("dashboard.stats.formalities", { defaultValue: "Formalności" })}
          </Text>
          <View style={styles.termsTilesRow}>
            <DashboardStatTile
              onPress={() =>
                openFormalitiesDateEditor(
                  "insurance_valid_until",
                  vehicle?.insurance_valid_until,
                  t("dashboard.stats.insurance"),
                  t("dashboard.formalitiesUpdate.insurancePrompt"),
                )
              }
              iconComponent={
                <ShieldCheck
                  size={20}
                  color={
                    insuranceDaysUntil != null && insuranceDaysUntil <= 30
                      ? theme.colors.danger
                      : theme.colors.accent
                  }
                />
              }
              label={t("dashboard.stats.insurance")}
              valueMain={formatTermsValue(
                vehicle?.insurance_valid_until,
                insuranceDaysUntil,
                t,
                i18n.language,
              )}
              valueMainColor={
                insuranceDaysUntil != null && insuranceDaysUntil < 0
                  ? theme.colors.danger
                  : undefined
              }
              backgroundColor={
                insuranceDaysUntil != null && insuranceDaysUntil <= 30
                  ? hexToRgba(theme.colors.danger, 0.18)
                  : undefined
              }
              labelColor={
                insuranceDaysUntil != null && insuranceDaysUntil <= 30
                  ? theme.colors.danger
                  : undefined
              }
              iconColor={
                insuranceDaysUntil != null && insuranceDaysUntil <= 30
                  ? theme.colors.danger
                  : undefined
              }
            />
            <DashboardStatTile
              onPress={() =>
                openFormalitiesDateEditor(
                  "inspection_valid_until",
                  vehicle?.inspection_valid_until,
                  t("dashboard.stats.inspection"),
                  t("dashboard.formalitiesUpdate.inspectionPrompt"),
                )
              }
              iconComponent={
                <CheckCheck
                  size={20}
                  color={
                    inspectionDaysUntil != null && inspectionDaysUntil <= 30
                      ? theme.colors.danger
                      : theme.colors.accent
                  }
                />
              }
              label={t("dashboard.stats.inspection")}
              valueMain={formatTermsValue(
                vehicle?.inspection_valid_until,
                inspectionDaysUntil,
                t,
                i18n.language,
              )}
              valueMainColor={
                inspectionDaysUntil != null && inspectionDaysUntil < 0
                  ? theme.colors.danger
                  : undefined
              }
              backgroundColor={
                inspectionDaysUntil != null && inspectionDaysUntil <= 30
                  ? hexToRgba(theme.colors.danger, 0.18)
                  : undefined
              }
              labelColor={
                inspectionDaysUntil != null && inspectionDaysUntil <= 30
                  ? theme.colors.danger
                  : undefined
              }
              iconColor={
                inspectionDaysUntil != null && inspectionDaysUntil <= 30
                  ? theme.colors.danger
                  : undefined
              }
            />
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("dashboard.stats.wheels")}
            </Text>
            <Pressable onPress={() => navigation.navigate("Wheels", { vehicleId })} hitSlop={8}>
              <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
                {t("dashboard.stats.viewAll")}
              </Text>
            </Pressable>
          </View>
          <DashboardStatTile
            iconComponent={<TireIcon size={24} color={theme.colors.accent} />}
            label={t("dashboard.stats.currentTire")}
            valueMain={
              <View style={styles.fittedSetsList}>
                {fittedTiresLines.map((line, idx) => (
                  <Text
                    key={`fitted-tire-${idx}`}
                    style={[styles.dashboardStatTileValueMain, { color: theme.colors.fg }]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            }
            fullWidth
          />
          <DashboardStatTile
            iconComponent={<RimIcon size={24} color={theme.colors.accent} />}
            label={t("dashboard.stats.currentWheel")}
            valueMain={
              <View style={styles.fittedSetsList}>
                {fittedWheelsLines.map((line, idx) => (
                  <Text
                    key={`fitted-wheel-${idx}`}
                    style={[styles.dashboardStatTileValueMain, { color: theme.colors.fg }]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            }
            fullWidth
          />
        </View>

        {vehicle?.notes?.trim() ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.infoCardTitle, { color: theme.colors.fg }]}>
              {t("manageVehicle.notesLabel")}
            </Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.notesText, { color: theme.colors.fg }]}>
                {vehicle.notes.trim()}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  const buttonsPage = (
    <ButtonsPage
      windowWidth={windowWidth}
      styles={styles}
      theme={theme}
      tiles={tiles}
      activeRemindersCount={activeRemindersCount}
    />
  );

  const statsPage = (
    <View style={[styles.page, { width: windowWidth }]}>
      <StatisticsScreen embedded vehicleId={vehicleId} />
    </View>
  );

  const pages = [buttonsPage, technicalDataPage, statsPage];

  const headerRight = (
    <View style={styles.headerRightActions}>
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
      <HeaderButton
        onPress={() => navigation.navigate("Settings")}
        tintColor={theme.colors.fg}
        accessibilityLabel={undefined}
      >
            <Settings size={theme.icons.headerButton} color={theme.colors.accent} />
      </HeaderButton>
    </View>
  );

  useEffect(() => {
    if (activePage <= 1 && scrollOffsetYRef.current > 4) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activePage]);

  useEffect(() => {
    const loadIconFonts = async () => {
      await Font.loadAsync({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
        ...FontAwesome5.font,
        ...MaterialIcons.font,
      });
    };
    void loadIconFonts();
  }, []);

  const handlePagerScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      pagerProgress.value = event.contentOffset.x / windowWidth;
    },
  });

  return (
    <HeaderLayout
      loading={loading}
      ready
      minLoadingMs={0}
      onBack={() => navigation.goBack()}
      backIcon={<Warehouse size={20} color={theme.colors.accent} />}
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
          <BlurView
            intensity={mode === "dark" ? 45 : 70}
            tint={mode === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
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
        visible={isPublicQrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPublicQrVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View
            style={[styles.qrModalCard, { backgroundColor: theme.colors.card }]}
          >
            <Pressable
              style={styles.qrModalClose}
              onPress={() => setIsPublicQrVisible(false)}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={theme.colors.fg} />
            </Pressable>
            {publicReportUrl ? (
              <View style={styles.qrWrap}>
                <QRCode
                  value={publicReportUrl}
                  size={220}
                  color={mode === "dark" ? "#ffffff" : "#000000"}
                  backgroundColor={theme.colors.bg}
                  ecl="H"
                />
                <View style={styles.qrLogoOverlay} pointerEvents="none">
                  <View
                    style={[
                      styles.qrLogoBadge,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: hexToRgba(theme.colors.accent, 0.28),
                      },
                    ]}
                  >
                    <Logo width={34} height={34} />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

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
    vehicleHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    vehicleHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      // paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.md,
    },
    vinText: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.bold,
      paddingRight: theme.spacing.xs,
    },
    publicPageCircleButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.accent,
      marginBottom: theme.spacing.md,
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
    sectionTitle: {
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
    panelSections: {
      gap: theme.spacing.xl,
    },
    quickMetricsCard: {
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    quickMetricsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      gap: 0,
    },
    quickMetricCell: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.xs / 2,
    },
    quickMetricPrimary: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      width: "100%",
      lineHeight: theme.typography.largeTitle + 4,
    },
    quickMetricInlineUnit: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    quickMetricSecondary: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
      width: "100%",
    },
    sectionBlock: {
      gap: theme.spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    viewAllLink: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    upcomingRemindersList: {
      gap: theme.spacing.sm,
    },
    termsTilesRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "stretch",
    },
    dashboardStatTilePressable: {
      flex: 1,
      minWidth: 0,
    },
    infoCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    infoCardTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      alignItems: "flex-start",
    },
    mileageStaleCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    mileageStaleCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    reminderTileIconWrap: {
      position: "relative",
    },
    reminderBadge: {
      position: "absolute",
      top: -8,
      right: -14,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: theme.colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    reminderBadgeText: {
      color: "#FFFFFF",
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 14,
    },
    mileageStaleCardTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.medium,
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
    notesText: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 6,
    },
    dashboardStatTile: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    dashboardStatTileFullWidth: {
      flex: undefined,
      width: "100%",
    },
    dashboardStatTileTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    },
    dashboardStatTileLabel: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.body,
      flex: 1,
    },
    dashboardStatTileValueRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    dashboardStatTileValueMain: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    fittedSetsList: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    quickActionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: theme.spacing.sm,
    },
    quickActionCard: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    quickActionIcon: {
      opacity: 0.95,
    },
    quickActionLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    dashboardStatTileValueSuffix: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
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
      overflow: "hidden",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor: "transparent",
      elevation: 4,
    },
    headerRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    qrModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    qrModalCard: {
      width: "100%",
      maxWidth: 320,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    qrModalClose: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      zIndex: 10,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    qrWrap: {
      position: "relative",
      width: 220,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
      margin: theme.spacing.xl,
    },
    qrLogoOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    qrLogoBadge: {
      borderRadius: 999,
      padding: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: theme.spacing.md,
      zIndex: 10,
      width: theme.spacing.xl + theme.spacing.lg,
      height: theme.spacing.xl + theme.spacing.lg,
      borderRadius: (theme.spacing.xl + theme.spacing.lg) / 2,
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
