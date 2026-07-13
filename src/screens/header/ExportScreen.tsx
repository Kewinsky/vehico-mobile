import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { APP_DISPLAY_NAME } from "../../config/appBrand";
import {
  buildExportPayload,
  resolveExportDateBounds,
  type ExportDataType,
  type ExportFormat,
  type ExportTimeRange,
} from "../../services/portability/exportData";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { Card, CardDivider } from "../../ui/components/common/Card";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { useFormFieldErrors } from "../../app/hooks/useFormFieldErrors";
import { toastCaughtError, toastError } from "../../ui/toast/toast";
import { isValidDate } from "../../utils/validation";
import { shareExportFile } from "../../utils/shareContent";

type Props = NativeStackScreenProps<AppStackParamList, "Export">;

const EXPORT_FORMATS = [
  "json",
  "csv",
] as const satisfies readonly ExportFormat[];

const EXPORT_DATA_TYPES = [
  "service_entries",
  "fueling_entries",
  "reminders",
  "wheels",
  "tires",
  "workshops",
] as const satisfies readonly ExportDataType[];

const EXPORT_TIME_RANGES = [
  "current_month",
  "previous_month",
  "last_90_days",
  "current_year",
  "custom",
] as const satisfies readonly ExportTimeRange[];

const DEFAULT_SELECTED_TYPES: ExportDataType[] = [
  "service_entries",
  "fueling_entries",
  "reminders",
];

export function ExportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    isPremium,
    freePlanVehicleId,
    freePlanWorkshopIds,
    freePlanReminderIds,
    freePlanTireId,
    freePlanWheelId,
  } = useEntitlements();
  const { vehicleId } = route.params;

  const isFreeVehicle = freePlanVehicleId === vehicleId;
  const reminderOpts = isPremium
    ? undefined
    : { freePlanReminderIds: isFreeVehicle ? freePlanReminderIds : [] };
  const tireOpts = isPremium
    ? undefined
    : { freePlanTireId: isFreeVehicle ? (freePlanTireId ?? null) : null };
  const wheelOpts = isPremium
    ? undefined
    : { freePlanWheelId: isFreeVehicle ? (freePlanWheelId ?? null) : null };
  const workshopOpts = isPremium ? undefined : { freePlanWorkshopIds };

  const [format, setFormat] = useState<ExportFormat>("json");
  const [selectedTypes, setSelectedTypes] = useState<ExportDataType[]>(
    DEFAULT_SELECTED_TYPES,
  );
  const [timeRange, setTimeRange] = useState<ExportTimeRange>("last_90_days");
  const [customFromYmd, setCustomFromYmd] = useState("");
  const [customToYmd, setCustomToYmd] = useState("");
  const [exporting, setExporting] = useState(false);

  const dateBounds = useMemo(
    () => resolveExportDateBounds(timeRange, customFromYmd, customToYmd),
    [timeRange, customFromYmd, customToYmd],
  );

  const customRangeCanSave =
    timeRange !== "custom" ||
    (isValidDate(customFromYmd) &&
      isValidDate(customToYmd) &&
      customFromYmd <= customToYmd);

  const { fieldError, validateBeforeSave } =
    useFormFieldErrors(customRangeCanSave);

  const customFromFieldInvalid =
    timeRange === "custom" && !isValidDate(customFromYmd);
  const customToFieldInvalid =
    timeRange === "custom" &&
    (!isValidDate(customToYmd) ||
      (isValidDate(customFromYmd) &&
        isValidDate(customToYmd) &&
        customFromYmd > customToYmd));

  function toggleDataType(type: ExportDataType) {
    if (exporting) return;
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type],
    );
  }

  async function handleExport() {
    if (exporting) return;
    if (selectedTypes.length === 0) {
      toastError(t("export.noDataTypesSelected"));
      return;
    }
    if (timeRange === "custom" && !validateBeforeSave()) {
      return;
    }
    try {
      setExporting(true);
      const { content, rowCount } = await buildExportPayload(
        {
          vehicleId,
          format,
          dataTypes: selectedTypes,
          dateBounds,
          entitlements: {
            reminderOpts,
            tireOpts,
            wheelOpts,
            workshopOpts,
          },
        },
        (type) => t(`export.dataTypes.${type}`),
      );

      if (rowCount === 0) {
        throw new Error(t("export.noDataInRange"));
      }

      await shareExportFile(
        content,
        format,
        t("export.shareTitle", { appName: APP_DISPLAY_NAME }),
      );
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setExporting(false);
    }
  }

  const CheckboxRow = ({
    label,
    checked,
    onPress,
    disabled,
  }: {
    label: string;
    checked: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      style={[styles.checkboxRow, disabled && styles.checkboxRowDisabled]}
      onPress={() => !disabled && onPress()}
      disabled={disabled}
    >
      <Text
        style={[styles.optionLabel, disabled && { color: theme.colors.muted }]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Ionicons
        name={checked ? "checkbox" : "checkbox-outline"}
        size={24}
        color={
          disabled
            ? theme.colors.muted
            : checked
              ? theme.colors.accent
              : theme.colors.muted
        }
      />
    </Pressable>
  );

  return (
    <HeaderLayout
      onBack={() => navigation.goBack()}
      showShopIcon={!isPremium}
      footer={
        <Button
          onPress={() => void handleExport()}
          disabled={exporting}
        >
          {exporting ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <ActivityIndicator size="small" color="#000000" />
              <Text
                style={{
                  color: "#000000",
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                {t("export.exporting")}
              </Text>
            </View>
          ) : (
            t("export.exportButton")
          )}
        </Button>
      }
    >
      <NativeHeaderScrollView>
        <ContentHeader title={t("export.title")} />

        <Card style={styles.cardSpaced}>
          <FormPickerRow<ExportFormat>
            label={t("export.formatLabel")}
            value={format}
            options={EXPORT_FORMATS}
            getLabel={(value) => t(`export.formats.${value}`)}
            onChange={(value) => {
              if (value) setFormat(value);
            }}
            disabled={exporting}
          />
        </Card>

        <Card style={styles.cardSpaced}>
          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.muted }]}>
              {t("export.dataTypesLabel")}
            </Text>
          </View>
          {EXPORT_DATA_TYPES.map((type, index) => (
            <View key={type}>
              {index > 0 ? <CardDivider /> : null}
              <CheckboxRow
                label={t(`export.dataTypes.${type}`)}
                checked={selectedTypes.includes(type)}
                onPress={() => toggleDataType(type)}
                disabled={exporting}
              />
            </View>
          ))}
        </Card>

        <Card style={styles.cardSpaced}>
          <FormPickerRow<ExportTimeRange>
            label={t("export.timeRangeLabel")}
            value={timeRange}
            options={EXPORT_TIME_RANGES}
            getLabel={(value) => t(`export.timeRanges.${value}`)}
            onChange={(value) => {
              if (value) setTimeRange(value);
            }}
            disabled={exporting}
          />
          {timeRange === "custom" ? (
            <>
              <CardDivider />
              <FormDateRow
                label={t("export.customFrom")}
                value={customFromYmd}
                onChange={setCustomFromYmd}
                disabled={exporting}
                error={fieldError(customFromFieldInvalid)}
              />
              <CardDivider />
              <FormDateRow
                label={t("export.customTo")}
                value={customToYmd}
                onChange={setCustomToYmd}
                disabled={exporting}
                error={fieldError(customToFieldInvalid)}
              />
            </>
          ) : null}
        </Card>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    cardSpaced: {
      marginBottom: theme.spacing.sm,
    },
    cardSection: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    checkboxRowDisabled: {
      opacity: 0.6,
    },
    optionLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
  });
