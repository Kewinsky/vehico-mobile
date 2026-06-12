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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import { Settings, Warehouse } from "lucide-react-native";
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
  type SharedValue,
} from "react-native-reanimated";

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
import {
  createServiceEntry,
  listServiceEntries,
} from "../../services/serviceEntries/serviceEntriesRepo";
import { getWorkshop } from "../../services/workshops/workshopsRepo";
import { computeOilChangeDueState } from "../../utils/oilChangeDue";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";
import { DashboardFab } from "../../ui/components/common/DashboardFab";
import { RichCalloutText } from "../../ui/components/dashboard/RichCalloutText";
import { openAndroidNativeDatePicker } from "../../ui/components/common/NativeDateTrigger";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { Logo } from "../../ui/components/branding/Logo";
import { formatRelativeTimePast } from "../../utils/formatRelativeTimePast";
import { isNonNegativeNumber, isValidDate } from "../../utils/validation";
import { formatShortDisplayDate } from "../../utils/dateFormatting";
import { formatYmd, parseYmd } from "../../utils/dateYmd";
import {
  groupThousands,
  localeCodeFromLanguage,
} from "../../utils/numberFormatting";
import { ButtonsPage } from "./vehicleDashboard/pages/ButtonsPage";
import { StatsPanelPage } from "./vehicleDashboard/pages/StatsPanelPage";
import { OverviewPanel } from "./vehicleDashboard/overview/OverviewPanel";
import { useOverviewPanelStyles } from "./vehicleDashboard/overview/overviewStyles";
import {
  getDaysUntilDate,
  getMileageStaleYmd,
  isReminderOverdue,
  quickMetricsWindowYmdBounds,
  shouldShowFormalityCallout,
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
  const [oilBookLoading, setOilBookLoading] = useState(false);
  const [formalityOverlay, setFormalityOverlay] = useState<{
    field: "insurance_valid_until" | "inspection_valid_until";
    value: string;
    title: string;
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const pagerRef = useRef<FlatList<number>>(null);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const pagerProgress = useSharedValue(1);
  const { distanceUnitLabel, consumptionUnitLine } = units;
  const currency = settings?.currency ?? "PLN";
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);
  const mileageStaleYmd = useMemo(() => {
    return getMileageStaleYmd(vehicle?.mileage, vehicle?.mileage_updated_at);
  }, [vehicle?.mileage, vehicle?.mileage_updated_at]);
  const oilChangeDueState = useMemo(
    () => computeOilChangeDueState(serviceEntries, vehicle?.mileage ?? null),
    [serviceEntries, vehicle?.mileage],
  );
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
    if (fittedTires.length === 0) return ["–"];
    return fittedTires.map(
      (item) =>
        `${formatTireDimensions(
          item.width_mm,
          item.aspect_ratio,
          item.diameter_inch,
        )} · ${(item.name ?? "").trim() || "–"}`,
    );
  }, [fittedTires]);
  const fittedWheelsLines = useMemo(() => {
    if (fittedWheels.length === 0) return ["–"];
    return fittedWheels.map(
      (item) =>
        `${formatWheelDimensions(item.width_inch, item.diameter_inch)} · ${
          (item.name ?? "").trim() || "–"
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
  const showInsuranceCallout = shouldShowFormalityCallout(insuranceDaysUntil);
  const showInspectionCallout = shouldShowFormalityCallout(inspectionDaysUntil);

  const insuranceCalloutCopy = useMemo(() => {
    if (!showInsuranceCallout || insuranceDaysUntil == null) return null;
    const date = formatShortDisplayDate(
      vehicle?.insurance_valid_until,
      i18n.language,
    );
    const title =
      insuranceDaysUntil < 0
        ? t("dashboard.insuranceBanner.titleOverdue")
        : insuranceDaysUntil === 0
          ? t("dashboard.insuranceBanner.titleDueToday")
          : t("dashboard.insuranceBanner.titleDueSoon", {
              days: insuranceDaysUntil,
            });
    return {
      title,
      description: (
        <RichCalloutText
          i18nKey="dashboard.insuranceBanner.validUntil"
          values={{ date }}
        />
      ),
    };
  }, [
    showInsuranceCallout,
    insuranceDaysUntil,
    vehicle?.insurance_valid_until,
    i18n.language,
  ]);

  const inspectionCalloutCopy = useMemo(() => {
    if (!showInspectionCallout || inspectionDaysUntil == null) return null;
    const date = formatShortDisplayDate(
      vehicle?.inspection_valid_until,
      i18n.language,
    );
    const title =
      inspectionDaysUntil < 0
        ? t("dashboard.inspectionBanner.titleOverdue")
        : inspectionDaysUntil === 0
          ? t("dashboard.inspectionBanner.titleDueToday")
          : t("dashboard.inspectionBanner.titleDueSoon", {
              days: inspectionDaysUntil,
            });
    return {
      title,
      description: (
        <RichCalloutText
          i18nKey="dashboard.inspectionBanner.validUntil"
          values={{ date }}
        />
      ),
    };
  }, [
    showInspectionCallout,
    inspectionDaysUntil,
    vehicle?.inspection_valid_until,
    i18n.language,
  ]);

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
      getPremiumUpgradeAlertButtons(t, navigation),
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

  function handleSectionOrderPress() {
    if (isPremium) {
      navigation.navigate("DashboardSectionOrder");
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("dashboard.sectionOrder.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, navigation),
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
        text: t("dashboard.sectionOrder.menu"),
        onPress: handleSectionOrderPress,
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
          getPremiumUpgradeAlertButtons(t, navigation),
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

  const oilBannerCopy = useMemo(() => {
    const { lastOilChange, isOverdue, remainingDays, remainingKm } =
      oilChangeDueState;
    const title = !lastOilChange
      ? t("dashboard.oilBanner.titleNoRecord")
      : isOverdue
        ? t("dashboard.oilBanner.titleOverdue")
        : t("dashboard.oilBanner.titleDueSoon");

    let description: ReactNode | undefined;
    if (lastOilChange) {
      if (remainingDays != null && remainingKm != null && !isOverdue) {
        description = (
          <RichCalloutText
            i18nKey="dashboard.oilBanner.remainingBoth"
            values={{
              days: remainingDays,
              km: groupThousands(remainingKm, 0, i18n.language),
            }}
          />
        );
      } else if (remainingDays != null && !isOverdue) {
        description = (
          <RichCalloutText
            i18nKey="dashboard.oilBanner.remainingDays"
            values={{ days: remainingDays }}
          />
        );
      } else if (remainingKm != null && !isOverdue) {
        description = (
          <RichCalloutText
            i18nKey="dashboard.oilBanner.remainingKm"
            values={{
              km: groupThousands(remainingKm, 0, i18n.language),
            }}
          />
        );
      }
    }

    let meta: ReactNode | undefined;
    if (lastOilChange) {
      const dateLabel = formatShortDisplayDate(
        lastOilChange.service_date,
        i18n.language,
      );
      const workshopName = lastOilChange.workshop_snapshot?.trim() || null;
      meta = (
        <Text
          style={{
            fontSize: theme.typography.small,
            lineHeight: theme.typography.small + 4,
            color: theme.colors.muted,
          }}
        >
          <RichCalloutText
            variant="inline"
            i18nKey="dashboard.oilBanner.lastChangeDate"
            values={{ date: dateLabel }}
          />
          {lastOilChange.mileage != null ? (
            <>
              {" · "}
              <RichCalloutText
                variant="inline"
                i18nKey="dashboard.oilBanner.lastChangeMileage"
                values={{
                  mileage: `${groupThousands(lastOilChange.mileage, 0, i18n.language)} ${distanceUnitLabel}`,
                }}
              />
            </>
          ) : null}
          {workshopName ? (
            <>
              {" · "}
              <RichCalloutText
                variant="inline"
                i18nKey="dashboard.oilBanner.lastChangeWorkshop"
                values={{ workshop: workshopName }}
              />
            </>
          ) : null}
        </Text>
      );
    }

    return { title, description, meta };
  }, [oilChangeDueState, t, i18n.language, distanceUnitLabel, theme]);

  const handleOilChangeDone = useCallback(() => {
    Alert.prompt(
      t("dashboard.oilBanner.donePromptTitle"),
      t("dashboard.oilBanner.donePromptMessage", {
        unit: distanceUnitLabel,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: async (value: string | undefined) => {
            const mileageRaw = (value ?? "").trim();
            const mileage =
              mileageRaw.length > 0
                ? isNonNegativeNumber(mileageRaw)
                  ? Number(mileageRaw)
                  : null
                : null;
            if (mileageRaw.length > 0 && mileage == null) {
              toastError(t("validation.nonNegativeRequired"));
              return;
            }
            try {
              const today = new Date().toISOString().slice(0, 10);
              const last = oilChangeDueState.lastOilChange;
              const created = await createServiceEntry({
                vehicle_id: vehicleId,
                service_date: today,
                mileage,
                category: "oil_change",
                title: t("dashboard.oilBanner.defaultEntryTitle"),
                description: "",
                cost: null,
                workshop_id: last?.workshop_id ?? null,
                workshop_snapshot: last?.workshop_snapshot ?? null,
              });
              setServiceEntries((prev) => [created, ...prev]);
              if (
                mileage != null &&
                (vehicle?.mileage == null || mileage > vehicle.mileage)
              ) {
                const updatedVehicle = await updateVehicle(vehicleId, {
                  mileage,
                  mileage_updated_at: today,
                });
                setVehicle(updatedVehicle);
              }
              toastSuccess(t("dashboard.oilBanner.doneSuccess"));
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
      "plain-text",
      vehicle?.mileage != null ? String(vehicle.mileage) : "",
    );
  }, [
    distanceUnitLabel,
    oilChangeDueState.lastOilChange,
    t,
    vehicle?.mileage,
    vehicleId,
  ]);

  const handleOilChangeBook = useCallback(async () => {
    const workshopId = oilChangeDueState.lastOilChange?.workshop_id;
    if (!workshopId) {
      toastError(t("dashboard.oilBanner.bookNoPhone"));
      return;
    }
    setOilBookLoading(true);
    try {
      const workshop = await getWorkshop(workshopId);
      const phone = workshop.phone_number?.trim() ?? "";
      if (!phone.length) {
        toastError(t("dashboard.oilBanner.bookNoPhone"));
        return;
      }
      const telHref = `tel:${phone.replace(/[^\d+#*;,.]/g, "")}`;
      await Linking.openURL(telHref);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setOilBookLoading(false);
    }
  }, [oilChangeDueState.lastOilChange?.workshop_id, t]);

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
      _prompt: string,
    ) => {
      const ymd = currentValue?.slice(0, 10) ?? "";
      if (Platform.OS === "android") {
        openAndroidNativeDatePicker(
          ymd,
          (nextYmd) => void saveFormalitiesDate(field, nextYmd),
        );
        return;
      }
      setFormalityOverlay({ field, value: ymd, title });
    },
    [saveFormalitiesDate],
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

  const overviewStyles = useOverviewPanelStyles();

  const technicalDataPage = (
    <OverviewPanel
      windowWidth={windowWidth}
      styles={overviewStyles}
      vehicleId={vehicleId}
      vehicle={vehicle}
      navigation={navigation}
      t={t}
      language={i18n.language}
      theme={theme}
      isPremium={isPremium}
      publicReportUrl={publicReportUrl}
      onCopyVin={onCopyVin}
      openPublicReportShareActions={openPublicReportShareActions}
      mileageStaleTitle={mileageStaleTitle}
      handleQuickMileageEdit={handleQuickMileageEdit}
      insuranceCalloutCopy={insuranceCalloutCopy}
      inspectionCalloutCopy={inspectionCalloutCopy}
      oilChangeDueState={oilChangeDueState}
      oilBannerCopy={oilBannerCopy}
      handleOilChangeDone={handleOilChangeDone}
      handleOilChangeBook={handleOilChangeBook}
      oilBookLoading={oilBookLoading}
      quickMetrics={quickMetrics}
      currency={currency}
      distanceUnitLabel={distanceUnitLabel}
      handleAddService={handleAddService}
      handleAddFuel={handleAddFuel}
      handleAddReminder={handleAddReminder}
      upcomingReminders={upcomingReminders}
      insuranceDaysUntil={insuranceDaysUntil}
      inspectionDaysUntil={inspectionDaysUntil}
      openFormalitiesDateEditor={openFormalitiesDateEditor}
      fittedTiresLines={fittedTiresLines}
      fittedWheelsLines={fittedWheelsLines}
    />
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
    <StatsPanelPage windowWidth={windowWidth} vehicleId={vehicleId} />
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

      {formalityOverlay && Platform.OS === "ios" ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setFormalityOverlay(null)}
        >
          <Pressable
            style={styles.datePickerOverlay}
            onPress={() => setFormalityOverlay(null)}
          >
            <Pressable
              style={[
                styles.datePickerCard,
                { backgroundColor: theme.colors.card },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <DateTimePicker
                value={parseYmd(
                  formalityOverlay.value.length === 10
                    ? formalityOverlay.value
                    : formatYmd(new Date()),
                )}
                mode="date"
                display="inline"
                locale={localeCodeFromLanguage(i18n.language)}
                accentColor={theme.colors.accent}
                themeVariant={mode === "dark" ? "dark" : "light"}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  setFormalityOverlay((prev) =>
                    prev ? { ...prev, value: formatYmd(selectedDate) } : prev,
                  );
                }}
              />
              <View style={styles.datePickerActions}>
                <Pressable
                  onPress={() => setFormalityOverlay(null)}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.datePickerActionText,
                      { color: theme.colors.muted },
                    ]}
                  >
                    {t("common.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void saveFormalitiesDate(
                      formalityOverlay.field,
                      formalityOverlay.value.length === 10
                        ? formalityOverlay.value
                        : formatYmd(new Date()),
                    );
                    setFormalityOverlay(null);
                  }}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.datePickerActionText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {t("common.save")}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
    datePickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    datePickerCard: {
      width: "100%",
      maxWidth: 380,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    datePickerActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.xl,
    },
    datePickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
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
