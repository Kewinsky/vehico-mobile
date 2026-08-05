import {
  createElement,
  Fragment,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, Linking, Text } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../../../app/navigation/RootNavigator";
import type {
  FuelingEntry,
  Reminder,
  ServiceEntry,
  Vehicle,
  VehicleTire,
  VehicleWheel,
} from "../../../types/domain";
import type { VehicleFormalityDateField } from "../../../constants/vehicleTypes";
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
import { countPendingWorkshopEntries } from "../../../services/workshopIntake/workshopIntakeRepo";
import { getWorkshop } from "../../../services/workshops/workshopsRepo";
import { computeOilChangeDueState } from "../../../utils/oilChangeDue";
import { useEntitlements } from "../../../app/providers/EntitlementsProvider";
import { useUnitDisplay } from "../../../app/hooks/useUnitDisplay";
import { useUserSettings } from "../../../app/providers/UserSettingsProvider";
import { useTheme } from "../../../ui/ThemeProvider";
import { toastCaughtError, toastError, toastSuccess } from "../../../ui/toast/toast";
import { promptAlert } from "../../../ui/prompt/promptAlert";
import { getPremiumUpgradeAlertButtons } from "../../../ui/limits/entitlementAlerts";
import { RichCalloutText } from "../../../ui/components/dashboard/RichCalloutText";
import { useScreenFocusReload } from "../../../app/useScreenFocusReload";
import { isNonNegativeNumber, isValidDate } from "../../../utils/validation";
import { formatRelativeTimePast } from "../../../utils/formatRelativeTimePast";
import { formatShortDisplayDate } from "../../../utils/dateFormatting";
import {
  getDaysUntilDate,
  getMileageStaleYmd,
  isReminderOverdue,
  currentMonthYmdBounds,
  shouldShowFormalityCallout,
} from "./domain/terms";
import { groupThousands } from "../../../utils/numberFormatting";

export type DashboardTile = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type UseVehicleDashboardStateParams = {
  vehicleId: string;
  navigation: NativeStackNavigationProp<AppStackParamList>;
};

export function useVehicleDashboardState({
  vehicleId,
  navigation,
}: UseVehicleDashboardStateParams) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const units = useUnitDisplay();
  const { settings } = useUserSettings();
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
  const [pendingWorkshopCount, setPendingWorkshopCount] = useState(0);
  const [publicReportUrl, setPublicReportUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);
  const [isPublicQrVisible, setIsPublicQrVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oilBookLoading, setOilBookLoading] = useState(false);
  const [formalityOverlay, setFormalityOverlay] = useState<{
    field: VehicleFormalityDateField;
    value: string;
    title: string;
  } | null>(null);
  const { distanceUnitLabel, consumptionUnitLine } = units;
  const currency = settings?.currency ?? "PLN";

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

  const acDaysUntil = useMemo(
    () => getDaysUntilDate(vehicle?.ac_valid_until),
    [vehicle?.ac_valid_until],
  );

  const inspectionDaysUntil = useMemo(
    () => getDaysUntilDate(vehicle?.inspection_valid_until),
    [vehicle?.inspection_valid_until],
  );

  const showInsuranceCallout = shouldShowFormalityCallout(insuranceDaysUntil);
  const showAcCallout = shouldShowFormalityCallout(acDaysUntil);
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
      description: createElement(RichCalloutText, {
        i18nKey: "dashboard.insuranceBanner.validUntil",
        values: { date },
      }),
    };
  }, [
    showInsuranceCallout,
    insuranceDaysUntil,
    vehicle?.insurance_valid_until,
    i18n.language,
    t,
  ]);

  const acCalloutCopy = useMemo(() => {
    if (!showAcCallout || acDaysUntil == null) return null;
    const date = formatShortDisplayDate(
      vehicle?.ac_valid_until,
      i18n.language,
    );
    const title =
      acDaysUntil < 0
        ? t("dashboard.acBanner.titleOverdue")
        : acDaysUntil === 0
          ? t("dashboard.acBanner.titleDueToday")
          : t("dashboard.acBanner.titleDueSoon", {
              days: acDaysUntil,
            });
    return {
      title,
      description: createElement(RichCalloutText, {
        i18nKey: "dashboard.acBanner.validUntil",
        values: { date },
      }),
    };
  }, [
    showAcCallout,
    acDaysUntil,
    vehicle?.ac_valid_until,
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
      description: createElement(RichCalloutText, {
        i18nKey: "dashboard.inspectionBanner.validUntil",
        values: { date },
      }),
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
          pendingWorkshopCountData,
        ] = await Promise.all([
          getVehicle(vehicleId),
          listVehiclePhotos(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
          isPremium ? listPublicPages(vehicleId) : Promise.resolve([]),
          listReminders(vehicleId, reminderOptions),
          listFuelingEntries(vehicleId),
          listServiceEntries(vehicleId),
          countPendingWorkshopEntries(vehicleId),
        ]);
        setVehicle(v);
        setPhotoUrls(photos.map((photo) => getVehiclePhotoUrl(photo)));
        setTires(tiresData);
        setWheels(wheelsData);
        setReminders(remindersData);
        setFuelingEntries(fuelingData);
        setServiceEntries(serviceData);
        setPendingWorkshopCount(pendingWorkshopCountData);
        const latestReport = reports[0];
        const reportUrl = latestReport?.public_id
          ? await getPublicPageUrl(latestReport.public_id)
          : null;
        setPublicReportUrl(reportUrl);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
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

  const handleSharePress = useCallback(() => {
    if (isPremium) {
      navigation.navigate("Share", { vehicleId });
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("limits.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, navigation),
    );
  }, [isPremium, navigation, vehicleId, t]);

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
      toastCaughtError(e, t("common.error"));
    }
  }

  async function handleCopyPublicReportLink() {
    if (!publicReportUrl) return;
    try {
      await Clipboard.setStringAsync(publicReportUrl);
      toastSuccess(t("share.linkCopied"));
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  function handleShowPublicReportQr() {
    if (!publicReportUrl) return;
    setIsPublicQrVisible(true);
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

  const handleManageVehicle = useCallback(() => {
    navigation.navigate("VehicleForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleSectionOrderPress = useCallback(() => {
    if (isPremium) {
      navigation.navigate("DashboardSectionOrder");
      return;
    }

    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("dashboard.sectionOrder.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, navigation),
    );
  }, [isPremium, navigation, t]);

  const handleAddService = useCallback(() => {
    navigation.navigate("ServiceEntryForm", { vehicleId });
  }, [navigation, vehicleId]);

  const handleWorkshopIntakePress = useCallback(() => {
    navigation.navigate("WorkshopIntake", { vehicleId });
  }, [navigation, vehicleId]);

  const handlePendingWorkshopPress = useCallback(() => {
    navigation.navigate("PendingWorkshopEntries", { vehicleId });
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
    promptAlert(
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
              toastCaughtError(e, t("common.error"));
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
        description = createElement(RichCalloutText, {
          i18nKey: "dashboard.oilBanner.remainingBoth",
          values: {
            days: remainingDays,
            km: groupThousands(remainingKm, 0, i18n.language),
          },
        });
      } else if (remainingDays != null && !isOverdue) {
        description = createElement(RichCalloutText, {
          i18nKey: "dashboard.oilBanner.remainingDays",
          values: { days: remainingDays },
        });
      } else if (remainingKm != null && !isOverdue) {
        description = createElement(RichCalloutText, {
          i18nKey: "dashboard.oilBanner.remainingKm",
          values: {
            km: groupThousands(remainingKm, 0, i18n.language),
          },
        });
      }
    }

    let meta: ReactNode | undefined;
    if (lastOilChange) {
      const dateLabel = formatShortDisplayDate(
        lastOilChange.service_date,
        i18n.language,
      );
      const workshopName = lastOilChange.workshop_snapshot?.trim() || null;
      meta = createElement(
        Text,
        {
          style: {
            fontSize: theme.typography.small,
            lineHeight: theme.typography.small + 4,
            color: theme.colors.muted,
          },
        },
        createElement(RichCalloutText, {
          variant: "inline",
          i18nKey: "dashboard.oilBanner.lastChangeDate",
          values: { date: dateLabel },
        }),
        lastOilChange.mileage != null
          ? createElement(
              Fragment,
              null,
              " · ",
              createElement(RichCalloutText, {
                variant: "inline",
                i18nKey: "dashboard.oilBanner.lastChangeMileage",
                values: {
                  mileage: `${groupThousands(lastOilChange.mileage, 0, i18n.language)} ${distanceUnitLabel}`,
                },
              }),
            )
          : null,
        workshopName
          ? createElement(
              Fragment,
              null,
              " · ",
              createElement(RichCalloutText, {
                variant: "inline",
                i18nKey: "dashboard.oilBanner.lastChangeWorkshop",
                values: { workshop: workshopName },
              }),
            )
          : null,
      );
    }

    return { title, description, meta };
  }, [oilChangeDueState, t, i18n.language, distanceUnitLabel, theme]);

  const handleOilChangeDone = useCallback(() => {
    promptAlert(
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
              toastCaughtError(e, t("common.error"));
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
      toastCaughtError(e, t("common.error"));
    } finally {
      setOilBookLoading(false);
    }
  }, [oilChangeDueState.lastOilChange?.workshop_id, t]);

  const saveFormalitiesDate = useCallback(
    async (field: VehicleFormalityDateField, value: string | null) => {
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
        toastCaughtError(e, t("common.error"));
      }
    },
    [t, vehicleId],
  );

  const openFormalitiesDateEditor = useCallback(
    (
      field: VehicleFormalityDateField,
      currentValue: string | null | undefined,
      title: string,
      _prompt: string,
    ) => {
      const ymd = currentValue?.slice(0, 10) ?? "";
      setFormalityOverlay({ field, value: ymd, title });
    },
    [],
  );

  const tiles: DashboardTile[] = useMemo(
    () => [
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
        key: "equipment",
        title: t("dashboard.tiles.equipmentTitle"),
        icon: "list",
        onPress: () => navigation.navigate("VehicleEquipment", { vehicleId }),
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
        key: "workshopIntake",
        title: t("dashboard.tiles.workshopIntakeTitle"),
        icon: "qr-code",
        onPress: handleWorkshopIntakePress,
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
    ],
    [t, navigation, vehicleId, handleSharePress, handleWorkshopIntakePress],
  );

  return {
    vehicleId,
    navigation,
    t,
    i18n,
    theme,
    mode,
    vehicle,
    tires,
    wheels,
    reminders,
    fuelingEntries,
    serviceEntries,
    pendingWorkshopCount,
    publicReportUrl,
    photoUrls,
    loading,
    oilBookLoading,
    formalityOverlay,
    setFormalityOverlay,
    fullScreenIndex,
    setFullScreenIndex,
    isPublicQrVisible,
    setIsPublicQrVisible,
    mileageStaleYmd,
    oilChangeDueState,
    fittedTiresLines,
    fittedWheelsLines,
    upcomingReminders,
    activeRemindersCount,
    insuranceDaysUntil,
    acDaysUntil,
    inspectionDaysUntil,
    showInsuranceCallout,
    showAcCallout,
    showInspectionCallout,
    insuranceCalloutCopy,
    acCalloutCopy,
    inspectionCalloutCopy,
    quickMetrics,
    mileageStaleTitle,
    oilBannerCopy,
    tiles,
    isPremium,
    currency,
    distanceUnitLabel,
    consumptionUnitLine,
    load,
    onCopyVin,
    handleSharePress,
    handleOpenPublicReportInBrowser,
    handleCopyPublicReportLink,
    handleShowPublicReportQr,
    handleManageVehicle,
    handleSectionOrderPress,
    onDeleteVehicle,
    handleAddService,
    handleAddFuel,
    handleAddReminder,
    handleWorkshopIntakePress,
    handlePendingWorkshopPress,
    handleQuickMileageEdit,
    handleOilChangeDone,
    handleOilChangeBook,
    saveFormalitiesDate,
    openFormalitiesDateEditor,
  };
}
