import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ActivityIndicator, Alert, Dimensions, Linking, Platform, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { routes } from "../../../core/navigation/routes";
import type {
  FuelingEntry,
  Reminder,
  ServiceEntry,
  Vehicle,
  VehicleTire,
  VehicleWheel,
} from "../../../types/domain";
import {
  deleteVehicle,
  getVehicle,
  updateVehicle,
  updateVehicleProfileMileage,
} from "../../../services/vehicles/vehiclesRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../../services/vehicles/uploadPhoto";
import {
  getPublicPageUrl,
  listPublicPages,
} from "../../../services/publicPages/publicPagesRepo";
import {
  formatTireDimensions,
  listVehicleTires,
} from "../../../services/tires/tiresRepo";
import {
  formatWheelDimensions,
  listVehicleWheels,
} from "../../../services/wheels/wheelsRepo";
import { listReminders } from "../../../services/reminders/remindersRepo";
import { getReminderProgressPercent } from "../../../services/reminders/reminderProgress";
import { listFuelingEntries } from "../../../services/fuel/fuelingEntriesRepo";
import {
  createServiceEntry,
  listServiceEntries,
} from "../../../services/serviceEntries/serviceEntriesRepo";
import { getWorkshop } from "../../../services/workshops/workshopsRepo";
import { computeOilChangeDueState } from "../../../utils/oilChangeDue";
import { useEntitlements } from "../../../core/providers/EntitlementsProvider";
import { useUnitDisplay } from "../../../core/hooks/useUnitDisplay";
import { useUserSettings } from "../../../core/providers/UserSettingsProvider";
import { useTheme } from "../../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../../ui/toast/toast";
import { getPremiumUpgradeAlertButtons } from "../../../ui/limits/entitlementAlerts";
import { RichCalloutText } from "../../../ui/components/dashboard/RichCalloutText";
import { openAndroidNativeDatePicker } from "../../../ui/components/common/NativeDateTrigger";
import { useFocusEffect } from "expo-router/react-navigation";
import { isNonNegativeNumber, isValidDate } from "../../../utils/validation";
import { formatRelativeTimePast } from "../../../utils/formatRelativeTimePast";
import { formatShortDisplayDate } from "../../../utils/dateFormatting";
import { formatYmd } from "../../../utils/dateYmd";
import {
  groupThousands,
} from "../../../utils/numberFormatting";
import { useOverviewPanelStyles } from "./overview/overviewStyles";
import {
  getDaysUntilDate,
  getMileageStaleYmd,
  isReminderOverdue,
  currentMonthYmdBounds,
  shouldShowFormalityCallout,
} from "./domain/terms";
import { Ionicons } from "@expo/vector-icons";

export type DashboardTile = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export type FormalityOverlay = {
  field: "insurance_valid_until" | "inspection_valid_until";
  value: string;
  title: string;
};

type VehicleDashboardContextValue = {
  vehicleId: string;
  loading: boolean;
  vehicle: Vehicle | null;
  serviceEntries: ServiceEntry[];
  fuelingEntries: FuelingEntry[];
  photoUrls: string[];
  publicReportUrl: string | null;
  windowWidth: number;
  windowHeight: number;
  vehicleImageHeight: number;
  theme: ReturnType<typeof useTheme>["theme"];
  mode: ReturnType<typeof useTheme>["mode"];
  insets: ReturnType<typeof useSafeAreaInsets>;
  isPremium: boolean;
  fullScreenIndex: number | null;
  setFullScreenIndex: (index: number | null) => void;
  isPublicQrVisible: boolean;
  setIsPublicQrVisible: (visible: boolean) => void;
  formalityOverlay: FormalityOverlay | null;
  setFormalityOverlay: Dispatch<SetStateAction<FormalityOverlay | null>>;
  overviewStyles: ReturnType<typeof useOverviewPanelStyles>;
  tiles: DashboardTile[];
  activeRemindersCount: number;
  onCopyVin: () => Promise<void>;
  handleShowPublicReportQr: () => void;
  handleCopyPublicReportLink: () => Promise<void>;
  handleOpenPublicReportInBrowser: () => Promise<void>;
  mileageStaleTitle: string | null;
  handleQuickMileageEdit: () => void;
  insuranceCalloutCopy: {
    title: string;
    description: ReactNode;
  } | null;
  inspectionCalloutCopy: {
    title: string;
    description: ReactNode;
  } | null;
  oilChangeDueState: ReturnType<typeof computeOilChangeDueState>;
  oilBannerCopy: {
    title: string;
    description?: ReactNode;
    meta?: ReactNode;
  };
  handleOilChangeDone: () => void;
  handleOilChangeBook: () => Promise<void>;
  oilBookLoading: boolean;
  quickMetrics: {
    consumptionPrimary: string;
    consumptionSecondary: string;
    costNumber: string;
    costShowCurrency: boolean;
    distanceNumber: string;
    distanceShowUnit: boolean;
    remindersPrimary: string;
  };
  currency: string;
  distanceUnitLabel: string;
  handleAddService: () => void;
  handleAddFuel: () => void;
  handleAddReminder: () => void;
  upcomingReminders: Reminder[];
  insuranceDaysUntil: number | null;
  inspectionDaysUntil: number | null;
  openFormalitiesDateEditor: (
    field: "insurance_valid_until" | "inspection_valid_until",
    currentValue: string | null | undefined,
    title: string,
    prompt: string,
  ) => void;
  fittedTiresLines: string[];
  fittedWheelsLines: string[];
  saveFormalitiesDate: (
    field: "insurance_valid_until" | "inspection_valid_until",
    value: string | null,
  ) => Promise<void>;
  openActions: () => void;
};

const VehicleDashboardContext =
  createContext<VehicleDashboardContextValue | null>(null);

export function useVehicleDashboard() {
  const context = useContext(VehicleDashboardContext);
  if (!context) {
    throw new Error(
      "useVehicleDashboard must be used within VehicleDashboardProvider",
    );
  }
  return context;
}

type VehicleDashboardProviderProps = {
  children: ReactNode;
};

export function VehicleDashboardProvider({
  children,
}: VehicleDashboardProviderProps) {
  const router = useRouter();
  const premiumNavigation = useMemo(
    () => ({
      navigate: (screen: string) => {
        if (screen === "Shop") {
          router.push(routes.shop());
        }
      },
    }),
    [router],
  );
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const units = useUnitDisplay();
  const { settings } = useUserSettings();
  const insets = useSafeAreaInsets();
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Array.isArray(vehicleIdParam)
    ? vehicleIdParam[0]
    : vehicleIdParam;

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
  const [loading, setLoading] = useState(false);
  const [oilBookLoading, setOilBookLoading] = useState(false);
  const [formalityOverlay, setFormalityOverlay] =
    useState<FormalityOverlay | null>(null);

  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const { distanceUnitLabel, consumptionUnitLine } = units;
  const currency = settings?.currency ?? "PLN";
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);
  const overviewStyles = useOverviewPanelStyles();

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
    t,
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
    t,
  ]);

  const quickMetrics = useMemo(() => {
    const { fromYmd, toYmd } = currentMonthYmdBounds();
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromYmdYear = oneYearAgo.toISOString().slice(0, 10);
    const fuelInCurrentMonth = fuelingEntries.filter((x) => {
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
    const distanceKmTotalForDistance = fuelInCurrentMonth.reduce(
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
      if (!vehicleId) return;
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

        if (showLoading) {
          setLoading(false);
        }

        const latestReport = reports[0];
        if (latestReport?.public_id) {
          try {
            const reportUrl = await getPublicPageUrl(latestReport.public_id);
            setPublicReportUrl(reportUrl);
          } catch {
            setPublicReportUrl(null);
          }
        } else {
          setPublicReportUrl(null);
        }
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

  const skipFocusReloadRef = useRef(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!vehicleId) return;
    void loadRef.current();
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      if (skipFocusReloadRef.current) {
        skipFocusReloadRef.current = false;
        return;
      }

      void (async () => {
        await refreshEntitlements();
        await loadRef.current({ showLoading: false });
      })();
    }, [refreshEntitlements]),
  );

  const onCopyVin = useCallback(async () => {
    if (vehicle?.vin) {
      await Clipboard.setStringAsync(vehicle.vin);
      toastSuccess(t("manageVehicle.vinCopied"));
    }
  }, [vehicle?.vin, t]);

  const handleSharePress = useCallback(() => {
    if (isPremium) {
      router.push(routes.share(vehicleId));
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("limits.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, premiumNavigation),
    );
  }, [isPremium, premiumNavigation, router, vehicleId, t]);

  const handleOpenPublicReportInBrowser = useCallback(async () => {
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
  }, [publicReportUrl, t]);

  const handleCopyPublicReportLink = useCallback(async () => {
    if (!publicReportUrl) return;
    try {
      await Clipboard.setStringAsync(publicReportUrl);
      toastSuccess(t("share.linkCopied"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }, [publicReportUrl, t]);

  const handleShowPublicReportQr = useCallback(() => {
    if (!publicReportUrl) return;
    setIsPublicQrVisible(true);
  }, [publicReportUrl]);

  const onDeleteVehicle = useCallback(() => {
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
              router.replace(routes.home());
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            }
          },
        },
      ],
    );
  }, [router, t, vehicleId]);

  const handleSectionOrderPress = useCallback(() => {
    if (isPremium) {
      router.push(routes.dashboardSectionOrder(vehicleId));
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("dashboard.sectionOrder.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, premiumNavigation),
    );
  }, [isPremium, premiumNavigation, router, vehicleId, t]);

  const openActions = useCallback(() => {
    Alert.alert(t("dashboard.tiles.manageTitle"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.edit"),
        onPress: () => router.push(routes.vehicleForm(vehicleId)),
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
  }, [handleSectionOrderPress, onDeleteVehicle, router, t, vehicleId]);

  const handleAddService = useCallback(() => {
    router.push(routes.serviceEntryForm(vehicleId));
  }, [router, vehicleId]);

  const handleAddFuel = useCallback(() => {
    router.push(routes.fuelingEntryForm(vehicleId));
  }, [router, vehicleId]);

  const handleAddReminder = useCallback(() => {
    if (!isPremium && freePlanVehicleId === vehicleId) {
      const visibleCount = freePlanReminderIds?.length ?? 0;
      if (visibleCount >= remindersLimit) {
        Alert.alert(
          t("limits.reminderLimitReachedTitle"),
          t("limits.reminderLimitReachedBody", { limit: remindersLimit }),
          getPremiumUpgradeAlertButtons(t, premiumNavigation),
        );
        return;
      }
    }
    router.push(routes.reminderForm(vehicleId));
  }, [
    router,
    vehicleId,
    isPremium,
    freePlanVehicleId,
    freePlanReminderIds,
    remindersLimit,
    premiumNavigation,
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
              const updatedVehicle = await updateVehicleProfileMileage(
                vehicleId,
                Number(mileageRaw),
              );
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

  const tiles: DashboardTile[] = useMemo(
    () => [
      {
        key: "service",
        title: t("dashboard.tiles.serviceTitle"),
        icon: "construct",
        onPress: () => router.push(routes.serviceHistory(vehicleId)),
      },
      {
        key: "docs",
        title: t("dashboard.tiles.docsTitle"),
        icon: "document-text",
        onPress: () => router.push(routes.documents(vehicleId)),
      },
      {
        key: "fuel",
        title: t("dashboard.tiles.fuelTitle"),
        icon: "flash",
        onPress: () => router.push(routes.fuel(vehicleId)),
      },
      {
        key: "reminders",
        title: t("dashboard.tiles.remindersTitle"),
        icon: "notifications",
        onPress: () => router.push(routes.reminders(vehicleId)),
      },
      {
        key: "wheels",
        title: t("dashboard.tiles.wheelsTitle"),
        icon: "disc",
        onPress: () => router.push(routes.wheels(vehicleId)),
      },
      {
        key: "workshops",
        title: t("dashboard.tiles.workshopsTitle"),
        icon: "business",
        onPress: () => router.push(routes.workshops()),
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
        onPress: () => router.push(routes.dataPortability(vehicleId)),
      },
    ],
    [handleSharePress, router, t, vehicleId],
  );

  const value = useMemo(
    (): VehicleDashboardContextValue => ({
      vehicleId,
      loading,
      vehicle,
      serviceEntries,
      fuelingEntries,
      photoUrls,
      publicReportUrl,
      windowWidth,
      windowHeight,
      vehicleImageHeight,
      theme,
      mode,
      insets,
      isPremium,
      fullScreenIndex,
      setFullScreenIndex,
      isPublicQrVisible,
      setIsPublicQrVisible,
      formalityOverlay,
      setFormalityOverlay,
      overviewStyles,
      tiles,
      activeRemindersCount,
      onCopyVin,
      handleShowPublicReportQr,
      handleCopyPublicReportLink,
      handleOpenPublicReportInBrowser,
      mileageStaleTitle,
      handleQuickMileageEdit,
      insuranceCalloutCopy,
      inspectionCalloutCopy,
      oilChangeDueState,
      oilBannerCopy,
      handleOilChangeDone,
      handleOilChangeBook,
      oilBookLoading,
      quickMetrics,
      currency,
      distanceUnitLabel,
      handleAddService,
      handleAddFuel,
      handleAddReminder,
      upcomingReminders,
      insuranceDaysUntil,
      inspectionDaysUntil,
      openFormalitiesDateEditor,
      fittedTiresLines,
      fittedWheelsLines,
      saveFormalitiesDate,
      openActions,
    }),
    [
      vehicleId,
      loading,
      vehicle,
      serviceEntries,
      fuelingEntries,
      photoUrls,
      publicReportUrl,
      windowWidth,
      windowHeight,
      vehicleImageHeight,
      theme,
      mode,
      insets,
      isPremium,
      fullScreenIndex,
      isPublicQrVisible,
      formalityOverlay,
      overviewStyles,
      tiles,
      activeRemindersCount,
      onCopyVin,
      handleShowPublicReportQr,
      handleCopyPublicReportLink,
      handleOpenPublicReportInBrowser,
      mileageStaleTitle,
      handleQuickMileageEdit,
      insuranceCalloutCopy,
      inspectionCalloutCopy,
      oilChangeDueState,
      oilBannerCopy,
      handleOilChangeDone,
      handleOilChangeBook,
      oilBookLoading,
      quickMetrics,
      currency,
      distanceUnitLabel,
      handleAddService,
      handleAddFuel,
      handleAddReminder,
      upcomingReminders,
      insuranceDaysUntil,
      inspectionDaysUntil,
      openFormalitiesDateEditor,
      fittedTiresLines,
      fittedWheelsLines,
      saveFormalitiesDate,
      openActions,
    ],
  );

  if (!vehicleId) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <VehicleDashboardContext.Provider value={value}>
      {children}
    </VehicleDashboardContext.Provider>
  );
}
