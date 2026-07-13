import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { DraggableGrid } from "react-native-draggable-grid";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { listFuelingEntries } from "../../services/fuel/fuelingEntriesRepo";
import { listMileageAudit } from "../../services/mileage/mileageAuditRepo";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import { listVehicleTires } from "../../services/tires/tiresRepo";
import { listVehicleWheels } from "../../services/wheels/wheelsRepo";
import {
  listVehiclePhotos,
  getVehiclePhotoUrl,
} from "../../services/vehicles/uploadPhoto";
import type { Vehicle, VehiclePhoto } from "../../types/domain";
import {
  MIN_MILEAGE_CHART_POINTS,
  MIN_STATS_ENTRIES,
  hasEnoughMileageChartPoints,
  hasEnoughStatsEntries,
} from "../../types/reportOptions";
import { Button } from "../../ui/components/common/Button";
import { AttachmentSourcePicker } from "../../ui/components/common/AttachmentSourcePicker";
import { ReportOptionGroup } from "../../ui/components/common/ReportOptionGroup";
import {
  getReportGroupMasterState,
  hasAnyEnabledReportOption,
  hasAnyCheckedReportOption,
  resetAllReportOptions,
  selectAllReportOptions,
  toggleReportGroupMaster,
  type ReportGroupItem,
} from "../../ui/components/common/reportOptionGroupUtils";
import { ReportOptionRow } from "../../ui/components/common/ReportOptionRow";
import { ReportOptionsCard } from "../../ui/components/common/ReportOptionsCard";
import { ReportOptionsActionsBar } from "../../ui/components/common/ReportOptionsActionsBar";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { getUnitDisplay } from "../../utils/unitGroups";
import { toastCaughtError, toastError } from "../../ui/toast/toast";

const MAX_PHOTOS = 40;

type Props = NativeStackScreenProps<AppStackParamList, "PublicReportConfigure">;

type LocalReportPhoto = {
  id: string;
  fileUri: string;
  displayOrder: number;
  mimeType?: string | null;
  fileName?: string | null;
};

type PhotoItem = {
  key: string;
  kind: "vehicle" | "local";
  photoId?: string;
  localId?: string;
  url: string;
  displayOrder: number;
};

export function PublicReportConfigureScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<VehiclePhoto[]>([]);
  const [fuelingCount, setFuelingCount] = useState(0);
  const [serviceEntriesCount, setServiceEntriesCount] = useState(0);
  const [serviceEntriesWithMileageCount, setServiceEntriesWithMileageCount] =
    useState(0);
  const [mileageAuditCount, setMileageAuditCount] = useState(0);
  const [tiresCount, setTiresCount] = useState(0);
  const [wheelsCount, setWheelsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const hasInsurance =
    (vehicle?.insurance_valid_until?.trim() ?? "").length > 0;
  const hasInspection =
    (vehicle?.inspection_valid_until?.trim() ?? "").length > 0;
  const hasNotes = (vehicle?.notes?.trim() ?? "").length > 0;
  const hasWheels = wheelsCount > 0;
  const hasTires = tiresCount > 0;
  const hasServiceHistory = serviceEntriesCount > 0;
  const hasServiceStats = hasEnoughStatsEntries(serviceEntriesCount);
  const hasFuelingStats = hasEnoughStatsEntries(fuelingCount);
  const hasExpensesCharts = hasEnoughStatsEntries(serviceEntriesCount);
  const hasMileageChart = hasEnoughMileageChartPoints(
    serviceEntriesWithMileageCount,
    mileageAuditCount,
  );

  const [includeTechnicalData] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [includeInspection, setIncludeInspection] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeWheels, setIncludeWheels] = useState(false);
  const [includeTires, setIncludeTires] = useState(false);
  const [includeServiceHistory, setIncludeServiceHistory] = useState(false);
  const [includeServiceStats, setIncludeServiceStats] = useState(false);
  const [includeFuelingStats, setIncludeFuelingStats] = useState(false);
  const [includeExpensesByCategoryChart, setIncludeExpensesByCategoryChart] =
    useState(false);
  const [includeExpensesOverTimeChart, setIncludeExpensesOverTimeChart] =
    useState(false);
  const [includeMileageOverTimeChart, setIncludeMileageOverTimeChart] =
    useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);

  const [selectedVehiclePhotoIds, setSelectedVehiclePhotoIds] = useState<
    Set<string>
  >(new Set());
  const [localPhotos, setLocalPhotos] = useState<LocalReportPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, photos, fuelings, serviceEntries, mileageAudit, tires, wheels] =
        await Promise.all([
          getVehicle(vehicleId),
          listVehiclePhotos(vehicleId),
          listFuelingEntries(vehicleId),
          listServiceEntries(vehicleId),
          listMileageAudit(vehicleId),
          listVehicleTires(vehicleId),
          listVehicleWheels(vehicleId),
        ]);
      setVehicle(v);
      setVehiclePhotos(photos);
      setFuelingCount(fuelings.length);
      setServiceEntriesCount(serviceEntries.length);
      setServiceEntriesWithMileageCount(
        serviceEntries.filter(
          (entry) =>
            entry.mileage != null &&
            Number.isFinite(entry.mileage) &&
            entry.mileage > 0,
        ).length,
      );
      setMileageAuditCount(mileageAudit.length);
      setTiresCount(tires.length);
      setWheelsCount(wheels.length);
      setSelectedVehiclePhotoIds(new Set(photos.map((p) => p.id)));
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const allPhotos: PhotoItem[] = useMemo(() => {
    const items: PhotoItem[] = [];
    vehiclePhotos
      .filter((p) => selectedVehiclePhotoIds.has(p.id))
      .forEach((photo) => {
        items.push({
          key: `vehicle-${photo.id}`,
          kind: "vehicle",
          photoId: photo.id,
          url: getVehiclePhotoUrl(photo),
          displayOrder: photo.display_order,
        });
      });
    localPhotos.forEach((photo) => {
      items.push({
        key: `local-${photo.id}`,
        kind: "local",
        localId: photo.id,
        url: photo.fileUri,
        displayOrder: photo.displayOrder,
      });
    });
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [vehiclePhotos, selectedVehiclePhotoIds, localPhotos]);

  const totalPhotoCount = allPhotos.length;

  const minStatsUnavailableBody = (count: number) =>
    t("publicReport.optionMinEntriesAlert", {
      min: MIN_STATS_ENTRIES,
      current: count,
    });

  const minMileageUnavailableBody = () =>
    t("publicReport.optionMinMileagePointsAlert", {
      min: MIN_MILEAGE_CHART_POINTS,
      current: serviceEntriesWithMileageCount + mileageAuditCount,
    });

  const formalitiesGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasInsurance,
          checked: includeInsurance,
          setChecked: setIncludeInsurance,
        },
        {
          enabled: hasInspection,
          checked: includeInspection,
          setChecked: setIncludeInspection,
        },
      ]),
    [hasInsurance, hasInspection, includeInsurance, includeInspection],
  );

  const wheelsGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasTires,
          checked: includeTires,
          setChecked: setIncludeTires,
        },
        {
          enabled: hasWheels,
          checked: includeWheels,
          setChecked: setIncludeWheels,
        },
      ]),
    [hasTires, hasWheels, includeTires, includeWheels],
  );

  const exploitationGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasServiceStats,
          checked: includeServiceStats,
          setChecked: setIncludeServiceStats,
        },
        {
          enabled: hasFuelingStats,
          checked: includeFuelingStats,
          setChecked: setIncludeFuelingStats,
        },
      ]),
    [
      hasServiceStats,
      hasFuelingStats,
      includeServiceStats,
      includeFuelingStats,
    ],
  );

  const chartsGroupState = useMemo(
    () =>
      getReportGroupMasterState([
        {
          enabled: hasMileageChart,
          checked: includeMileageOverTimeChart,
          setChecked: setIncludeMileageOverTimeChart,
        },
        {
          enabled: hasExpensesCharts,
          checked: includeExpensesOverTimeChart,
          setChecked: setIncludeExpensesOverTimeChart,
        },
        {
          enabled: hasExpensesCharts,
          checked: includeExpensesByCategoryChart,
          setChecked: setIncludeExpensesByCategoryChart,
        },
      ]),
    [
      hasMileageChart,
      hasExpensesCharts,
      includeMileageOverTimeChart,
      includeExpensesOverTimeChart,
      includeExpensesByCategoryChart,
    ],
  );

  const allReportOptions = useMemo((): ReportGroupItem[] => {
    return [
      {
        enabled: hasServiceHistory,
        checked: includeServiceHistory,
        setChecked: setIncludeServiceHistory,
      },
      {
        enabled: hasNotes,
        checked: includeNotes,
        setChecked: setIncludeNotes,
      },
      {
        enabled: hasInsurance,
        checked: includeInsurance,
        setChecked: setIncludeInsurance,
      },
      {
        enabled: hasInspection,
        checked: includeInspection,
        setChecked: setIncludeInspection,
      },
      {
        enabled: hasTires,
        checked: includeTires,
        setChecked: setIncludeTires,
      },
      {
        enabled: hasWheels,
        checked: includeWheels,
        setChecked: setIncludeWheels,
      },
      {
        enabled: hasServiceStats,
        checked: includeServiceStats,
        setChecked: setIncludeServiceStats,
      },
      {
        enabled: hasFuelingStats,
        checked: includeFuelingStats,
        setChecked: setIncludeFuelingStats,
      },
      {
        enabled: hasMileageChart,
        checked: includeMileageOverTimeChart,
        setChecked: setIncludeMileageOverTimeChart,
      },
      {
        enabled: hasExpensesCharts,
        checked: includeExpensesOverTimeChart,
        setChecked: setIncludeExpensesOverTimeChart,
      },
      {
        enabled: hasExpensesCharts,
        checked: includeExpensesByCategoryChart,
        setChecked: setIncludeExpensesByCategoryChart,
      },
      {
        enabled: true,
        checked: includePhotos,
        setChecked: setIncludePhotos,
      },
    ];
  }, [
    hasServiceHistory,
    hasNotes,
    hasInsurance,
    hasInspection,
    hasTires,
    hasWheels,
    hasServiceStats,
    hasFuelingStats,
    hasMileageChart,
    hasExpensesCharts,
    includeServiceHistory,
    includeNotes,
    includeInsurance,
    includeInspection,
    includeTires,
    includeWheels,
    includeServiceStats,
    includeFuelingStats,
    includeMileageOverTimeChart,
    includeExpensesOverTimeChart,
    includeExpensesByCategoryChart,
    includePhotos,
  ]);

  const canSelectAll = hasAnyEnabledReportOption(allReportOptions);
  const canReset = hasAnyCheckedReportOption(allReportOptions);

  function handleSelectAll() {
    selectAllReportOptions(allReportOptions);
  }

  function handleReset() {
    resetAllReportOptions(allReportOptions);
  }

  function addPhotosFromAssets(
    assets: Array<{
      uri: string;
      mimeType?: string | null;
      fileName?: string | null;
    }>,
  ) {
    const remainingSlots = MAX_PHOTOS - totalPhotoCount;
    if (remainingSlots <= 0) {
      toastError(t("publicReport.maxPhotosReached"));
      return;
    }
    const picked = assets.filter((asset) => asset.uri);
    if (picked.length === 0) {
      toastError(t("attachments.noFileSelected"));
      return;
    }
    const newPhotos = picked.slice(0, remainingSlots).map((asset, index) => ({
      id: `${Date.now()}-${index}-${Math.random()}`,
      fileUri: asset.uri,
      displayOrder: totalPhotoCount + index,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? null,
    }));
    setLocalPhotos((prev) => [...prev, ...newPhotos]);
  }

  async function pickFromCamera() {
    try {
      if (MAX_PHOTOS - totalPhotoCount <= 0) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.cameraPermissionDenied"));
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      addPhotosFromAssets([
        {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        },
      ]);
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  async function pickFromGallery() {
    try {
      const remainingSlots = MAX_PHOTOS - totalPhotoCount;
      if (remainingSlots <= 0) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.galleryPermissionDenied"));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });
      if (result.canceled) return;
      if (!result.assets || result.assets.length === 0) {
        throw new Error(t("attachments.noFileSelected"));
      }
      addPhotosFromAssets(
        result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        })),
      );
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  async function pickFromFiles() {
    try {
      const remainingSlots = MAX_PHOTOS - totalPhotoCount;
      if (remainingSlots <= 0) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: remainingSlots > 1,
      });
      if (result.canceled) return;
      if (!result.assets || result.assets.length === 0) {
        throw new Error(t("attachments.noFileSelected"));
      }
      addPhotosFromAssets(
        result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.name,
        })),
      );
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }

  function removeLocalPhoto(id: string) {
    setLocalPhotos(localPhotos.filter((p) => p.id !== id));
  }

  function toggleVehiclePhoto(photoId: string) {
    const newSet = new Set(selectedVehiclePhotoIds);
    if (newSet.has(photoId)) {
      newSet.delete(photoId);
    } else {
      if (totalPhotoCount >= MAX_PHOTOS) {
        toastError(t("publicReport.maxPhotosReached"));
        return;
      }
      newSet.add(photoId);
    }
    setSelectedVehiclePhotoIds(newSet);
  }

  function handleDragRelease(data: PhotoItem[]) {
    setIsDragging(false);
    const vehiclePhotoMap = new Map(vehiclePhotos.map((p) => [p.id, p]));
    const localPhotoMap = new Map(localPhotos.map((p) => [p.id, p]));
    const newVehiclePhotos = [...vehiclePhotos];
    const newLocalPhotos = [...localPhotos];
    data.forEach((item, index) => {
      if (item.kind === "vehicle" && item.photoId) {
        const photo = vehiclePhotoMap.get(item.photoId);
        if (photo) {
          const idx = newVehiclePhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0)
            newVehiclePhotos[idx] = { ...photo, display_order: index };
        }
      } else if (item.kind === "local" && item.localId) {
        const photo = localPhotoMap.get(item.localId);
        if (photo) {
          const idx = newLocalPhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) newLocalPhotos[idx] = { ...photo, displayOrder: index };
        }
      }
    });
    setVehiclePhotos(newVehiclePhotos);
    setLocalPhotos(newLocalPhotos);
  }

  const renderPhotoItem = (item: PhotoItem) => (
    <View style={styles.photoCard}>
      <View style={styles.photoImageContainer}>
        <Image
          source={{ uri: item.url }}
          style={styles.photoImage}
          contentFit="cover"
          transition={200}
        />
        <Pressable
          onPress={() =>
            item.kind === "vehicle"
              ? item.photoId && toggleVehiclePhoto(item.photoId)
              : item.localId && removeLocalPhoto(item.localId)
          }
          style={styles.photoCloseButton}
          hitSlop={5}
        >
          <Ionicons name="close-circle" size={28} color={theme.colors.accent} />
        </Pressable>
      </View>
    </View>
  );

  function handleNext() {
    navigation.navigate("PublicReportSummary", {
      vehicleId,
      reportOptions: {
        include_technical_data: includeTechnicalData,
        include_insurance: includeInsurance,
        include_inspection: includeInspection,
        include_notes: includeNotes,
        include_wheels: includeWheels,
        include_tires: includeTires,
        include_service_history: includeServiceHistory,
        include_service_stats: includeServiceStats,
        include_fueling_stats: includeFuelingStats,
        include_expenses_by_category_chart: includeExpensesByCategoryChart,
        include_expenses_over_time_chart: includeExpensesOverTimeChart,
        include_mileage_over_time_chart: includeMileageOverTimeChart,
        include_photos: includePhotos,
        distance_unit: getUnitDisplay(settings).distanceUnit,
        fuel_unit: getUnitDisplay(settings).fuelUnit,
        currency: settings?.currency ?? "PLN",
      },
      reportPhotos: includePhotos
        ? allPhotos.map((item, index) => {
            if (item.kind === "vehicle" && item.photoId) {
              return {
                kind: "vehicle" as const,
                vehiclePhotoId: item.photoId,
                displayOrder: index,
              };
            }
            const local = localPhotos.find((p) => p.id === item.localId);
            return {
              kind: "local" as const,
              fileUri: local?.fileUri ?? item.url,
              displayOrder: index,
              mimeType: local?.mimeType,
              fileName: local?.fileName,
            };
          })
        : [],
    });
  }

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  return (
    <HeaderContentScreen
      loading={loading}
      onBack={() => navigation.goBack()}
      showProfileAvatar
      footer={
        <Button onPress={handleNext}>{t("publicReport.nextButton")}</Button>
      }
      title={t("publicReport.configureTitle")}
      scrollEnabled={!isDragging}
    >
      <View>
        <ReportOptionsActionsBar
          onSelectAll={handleSelectAll}
          onReset={handleReset}
          selectAllDisabled={!canSelectAll}
          resetDisabled={!canReset}
        />
        <ReportOptionsCard>
          <ReportOptionRow
            label={t("publicReport.optionServiceHistory")}
            checked={includeServiceHistory}
            onPress={() => setIncludeServiceHistory(!includeServiceHistory)}
            disabled={!hasServiceHistory}
            unavailableTitle={t("publicReport.optionServiceHistory")}
            unavailableBody={t("publicReport.optionServiceHistoryUnavailable")}
          />
          <ReportOptionRow
            label={t("publicReport.optionNotes", { vehicleTitle })}
            checked={includeNotes}
            onPress={() => setIncludeNotes(!includeNotes)}
            disabled={!hasNotes}
            unavailableTitle={t("publicReport.optionNotes", { vehicleTitle })}
            unavailableBody={t("publicReport.unavailableNoData")}
            isLast
          />
        </ReportOptionsCard>

        <ReportOptionGroup
          title={t("publicReport.formalitiesGroup")}
          masterChecked={formalitiesGroupState.masterChecked}
          masterDisabled={formalitiesGroupState.masterDisabled}
          onMasterToggle={() =>
            toggleReportGroupMaster([
              {
                enabled: hasInsurance,
                checked: includeInsurance,
                setChecked: setIncludeInsurance,
              },
              {
                enabled: hasInspection,
                checked: includeInspection,
                setChecked: setIncludeInspection,
              },
            ])
          }
        >
          <ReportOptionRow
            label={t("publicReport.optionInsurance")}
            checked={includeInsurance}
            onPress={() => setIncludeInsurance(!includeInsurance)}
            disabled={!hasInsurance}
            unavailableTitle={t("publicReport.optionInsurance")}
            unavailableBody={t("publicReport.unavailableNoData")}
          />
          <ReportOptionRow
            label={t("publicReport.optionInspection")}
            checked={includeInspection}
            onPress={() => setIncludeInspection(!includeInspection)}
            disabled={!hasInspection}
            unavailableTitle={t("publicReport.optionInspection")}
            unavailableBody={t("publicReport.unavailableNoData")}
            isLast
          />
        </ReportOptionGroup>

        <ReportOptionGroup
          title={t("publicReport.wheelsGroup")}
          masterChecked={wheelsGroupState.masterChecked}
          masterDisabled={wheelsGroupState.masterDisabled}
          onMasterToggle={() =>
            toggleReportGroupMaster([
              {
                enabled: hasTires,
                checked: includeTires,
                setChecked: setIncludeTires,
              },
              {
                enabled: hasWheels,
                checked: includeWheels,
                setChecked: setIncludeWheels,
              },
            ])
          }
        >
          <ReportOptionRow
            label={t("publicReport.optionTires")}
            checked={includeTires}
            onPress={() => setIncludeTires(!includeTires)}
            disabled={!hasTires}
            unavailableTitle={t("publicReport.optionTires")}
            unavailableBody={t("publicReport.unavailableNoData")}
          />
          <ReportOptionRow
            label={t("publicReport.optionWheels")}
            checked={includeWheels}
            onPress={() => setIncludeWheels(!includeWheels)}
            disabled={!hasWheels}
            unavailableTitle={t("publicReport.optionWheels")}
            unavailableBody={t("publicReport.unavailableNoData")}
            isLast
          />
        </ReportOptionGroup>

        <ReportOptionGroup
          title={t("publicReport.exploitationStatsGroup")}
          masterChecked={exploitationGroupState.masterChecked}
          masterDisabled={exploitationGroupState.masterDisabled}
          onMasterToggle={() =>
            toggleReportGroupMaster([
              {
                enabled: hasServiceStats,
                checked: includeServiceStats,
                setChecked: setIncludeServiceStats,
              },
              {
                enabled: hasFuelingStats,
                checked: includeFuelingStats,
                setChecked: setIncludeFuelingStats,
              },
            ])
          }
        >
          <ReportOptionRow
            label={t("publicReport.optionServiceStats")}
            checked={includeServiceStats}
            onPress={() => setIncludeServiceStats(!includeServiceStats)}
            disabled={!hasServiceStats}
            unavailableTitle={t("publicReport.optionServiceStats")}
            unavailableBody={minStatsUnavailableBody(serviceEntriesCount)}
            infoTitle={t("publicReport.optionInfo.serviceStatsTitle")}
            infoBody={t("publicReport.optionInfo.serviceStatsBody")}
          />
          <ReportOptionRow
            label={t("publicReport.optionFuelingStats")}
            checked={includeFuelingStats}
            onPress={() => setIncludeFuelingStats(!includeFuelingStats)}
            disabled={!hasFuelingStats}
            unavailableTitle={t("publicReport.optionFuelingStats")}
            unavailableBody={minStatsUnavailableBody(fuelingCount)}
            infoTitle={t("publicReport.optionInfo.fuelingStatsTitle")}
            infoBody={t("publicReport.optionInfo.fuelingStatsBody")}
            isLast
          />
        </ReportOptionGroup>

        <ReportOptionGroup
          title={t("publicReport.chartsGroup")}
          masterChecked={chartsGroupState.masterChecked}
          masterDisabled={chartsGroupState.masterDisabled}
          onMasterToggle={() =>
            toggleReportGroupMaster([
              {
                enabled: hasMileageChart,
                checked: includeMileageOverTimeChart,
                setChecked: setIncludeMileageOverTimeChart,
              },
              {
                enabled: hasExpensesCharts,
                checked: includeExpensesOverTimeChart,
                setChecked: setIncludeExpensesOverTimeChart,
              },
              {
                enabled: hasExpensesCharts,
                checked: includeExpensesByCategoryChart,
                setChecked: setIncludeExpensesByCategoryChart,
              },
            ])
          }
        >
          <ReportOptionRow
            label={t("publicReport.optionMileageOverTimeChart")}
            checked={includeMileageOverTimeChart}
            onPress={() =>
              setIncludeMileageOverTimeChart(!includeMileageOverTimeChart)
            }
            disabled={!hasMileageChart}
            unavailableTitle={t("publicReport.optionMileageOverTimeChart")}
            unavailableBody={minMileageUnavailableBody()}
            infoTitle={t("publicReport.optionInfo.mileageOverTimeTitle")}
            infoBody={t("publicReport.optionInfo.mileageOverTimeBody")}
          />
          <ReportOptionRow
            label={t("publicReport.optionExpensesOverTimeChart")}
            checked={includeExpensesOverTimeChart}
            onPress={() =>
              setIncludeExpensesOverTimeChart(!includeExpensesOverTimeChart)
            }
            disabled={!hasExpensesCharts}
            unavailableTitle={t("publicReport.optionExpensesOverTimeChart")}
            unavailableBody={minStatsUnavailableBody(serviceEntriesCount)}
            infoTitle={t("publicReport.optionInfo.expensesOverTimeTitle")}
            infoBody={t("publicReport.optionInfo.expensesOverTimeBody")}
          />
          <ReportOptionRow
            label={t("publicReport.optionExpensesByCategoryChart")}
            checked={includeExpensesByCategoryChart}
            onPress={() =>
              setIncludeExpensesByCategoryChart(!includeExpensesByCategoryChart)
            }
            disabled={!hasExpensesCharts}
            unavailableTitle={t("publicReport.optionExpensesByCategoryChart")}
            unavailableBody={minStatsUnavailableBody(serviceEntriesCount)}
            infoTitle={t("publicReport.optionInfo.expensesByCategoryTitle")}
            infoBody={t("publicReport.optionInfo.expensesByCategoryBody")}
            isLast
          />
        </ReportOptionGroup>

        <ReportOptionsCard>
          <ReportOptionRow
            label={t("publicReport.optionPhotos")}
            checked={includePhotos}
            onPress={() => setIncludePhotos(!includePhotos)}
            isLast
          />
        </ReportOptionsCard>
      </View>

      {includePhotos && (
        <View style={styles.section}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosCount}>
              {t("publicReport.photosCount", {
                count: totalPhotoCount,
              })}
            </Text>
          </View>
          {vehiclePhotos.length > 0 && (
            <>
              <Text style={styles.photosSubtitle}>
                {t("publicReport.photosFromApp")}
              </Text>
              <View style={styles.vehiclePhotosList}>
                {vehiclePhotos.map((photo) => {
                  const isSelected = selectedVehiclePhotoIds.has(photo.id);
                  return (
                    <Pressable
                      key={photo.id}
                      onPress={() => toggleVehiclePhoto(photo.id)}
                      style={[
                        styles.vehiclePhotoItem,
                        isSelected && styles.vehiclePhotoItemSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: getVehiclePhotoUrl(photo) }}
                        style={styles.vehiclePhotoThumbnail}
                        contentFit="cover"
                      />
                      <View style={styles.vehiclePhotoCheckbox}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "checkbox-outline"}
                          size={26}
                          color={
                            isSelected
                              ? theme.colors.accent
                              : theme.colors.muted
                          }
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {allPhotos.length > 0 && (
            <DraggableGrid
              numColumns={3}
              renderItem={renderPhotoItem}
              data={allPhotos}
              onDragStart={() => setIsDragging(true)}
              onDragRelease={handleDragRelease}
            />
          )}
          {totalPhotoCount < MAX_PHOTOS && (
            <View style={styles.addPhotoButtons}>
              <AttachmentSourcePicker
                label={t("publicReport.addPhotos")}
                triggerStyle={styles.addPhotoButton}
                handlers={{
                  onCamera: () => void pickFromCamera(),
                  onPhotos: () => void pickFromGallery(),
                  onFiles: () => void pickFromFiles(),
                }}
              />
            </View>
          )}
        </View>
      )}
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    header: { gap: theme.spacing.xs / 2, marginBottom: theme.spacing.md },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    section: { marginBottom: theme.spacing.md },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      marginBottom: theme.spacing.sm,
    },
    photosHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    photosCount: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.accent,
    },
    photosSubtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm,
    },
    vehiclePhotosList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    vehiclePhotoItem: {
      width: theme.spacing.xl * 2 + theme.spacing.sm,
      height: theme.spacing.xl * 2 + theme.spacing.sm,
      borderRadius: theme.radius.sm,
      overflow: "hidden",
      position: "relative",
    },
    vehiclePhotoItemSelected: { borderColor: theme.colors.accent },
    vehiclePhotoThumbnail: { width: "100%", height: "100%" },
    vehiclePhotoCheckbox: {
      position: "absolute",
      top: 4,
      right: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    photoCard: { margin: theme.spacing.xs },
    photoImageContainer: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      position: "relative",
    },
    photoImage: { width: "100%", height: "100%" },
    photoCloseButton: {
      position: "absolute",
      top: 4,
      right: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    addPhotoButtons: { marginTop: theme.spacing.sm / 2 },
    addPhotoButton: { marginBottom: theme.spacing.xs },
  });
