import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import type { FuelType, TransmissionType } from "../../../../../types/domain";
import { useTheme } from "../../../../../ui/ThemeProvider";
import { toastSuccess } from "../../../../../ui/toast/toast";
import { formatShortDisplayDate } from "../../../../../utils/dateFormatting";
import { groupThousands } from "../../../../../utils/numberFormatting";
import { DashboardSection } from "../../components/DashboardSection";
import type { OverviewPanelProps } from "../types";

const EMPTY_VALUE = "–";

type SpecRowItem = {
  label: string;
  value: string;
  copyText?: string;
  copiedMessage?: string;
};

type SpecGroupItem = {
  title: string;
  rows: SpecRowItem[];
};

function enumLabel(
  prefix: "vehicleForm.fuelType" | "vehicleForm.transmission",
  value: string,
  t: OverviewPanelProps["t"],
) {
  const suffix = value.charAt(0).toUpperCase() + value.slice(1);
  return t(`${prefix}${suffix}` as never);
}

function isFilled(value: string | number | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function formatDistance(
  value: number | null | undefined,
  language: string,
  unit: string,
) {
  if (value == null) return EMPTY_VALUE;
  return `${groupThousands(value, 0, language)} ${unit}`;
}

export function SpecificationSection({
  styles,
  theme,
  t,
  vehicle,
  language,
  vehicleId,
  navigation,
  distanceUnitLabel,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "vehicle"
  | "language"
  | "vehicleId"
  | "navigation"
  | "distanceUnitLabel"
>) {
  const { theme: appTheme } = useTheme();
  const specStyles = makeSpecStyles(appTheme);

  const vin = vehicle?.vin?.trim() || "";
  const plate = vehicle?.license_plate?.trim() || "";
  const plateCopyText = plate.replace(/\s+/g, "");
  const firstRegistrationRaw = vehicle?.first_registration_date?.trim() || "";
  const firstRegistration = firstRegistrationRaw
    ? formatShortDisplayDate(firstRegistrationRaw, language)
    : EMPTY_VALUE;

  const fuelValue =
    vehicle?.fuel_type != null
      ? enumLabel("vehicleForm.fuelType", vehicle.fuel_type as FuelType, t)
      : EMPTY_VALUE;
  const transmissionValue =
    vehicle?.transmission != null
      ? enumLabel(
          "vehicleForm.transmission",
          vehicle.transmission as TransmissionType,
          t,
        )
      : EMPTY_VALUE;

  const identityRows: SpecRowItem[] = [
    {
      label: t("vehicleForm.vinLabel"),
      value: vin || EMPTY_VALUE,
      copyText: vin || undefined,
      copiedMessage: t("dashboard.copiedVin"),
    },
    {
      label: t("vehicleForm.licensePlateLabel"),
      value: plate || EMPTY_VALUE,
      copyText: plateCopyText || undefined,
      copiedMessage: t("dashboard.copiedLicensePlate"),
    },
    {
      label: t("vehicleForm.firstRegistrationDateLabel"),
      value: firstRegistration !== "–" ? firstRegistration : EMPTY_VALUE,
      copyText:
        firstRegistrationRaw && firstRegistration !== "–"
          ? firstRegistration
          : undefined,
      copiedMessage: t("dashboard.copiedRegistrationDate"),
    },
  ];

  const powertrainRows: SpecRowItem[] = [
    { label: t("vehicleForm.fuelTypeLabel"), value: fuelValue },
    {
      label: t("vehicleForm.engineCapacityLabel"),
      value: vehicle?.engine_capacity
        ? `${groupThousands(vehicle.engine_capacity, 0, language)} cm³`
        : EMPTY_VALUE,
    },
    {
      label: t("vehicleForm.powerHpLabel"),
      value: vehicle?.power_hp
        ? `${groupThousands(vehicle.power_hp, 0, language)} ${t("vehicleForm.powerOutputUnit")}`
        : EMPTY_VALUE,
    },
    { label: t("vehicleForm.transmissionLabel"), value: transmissionValue },
    {
      label: t("vehicleForm.driveTypeLabel"),
      value: vehicle?.drive_type || EMPTY_VALUE,
    },
  ];

  const mileageRows: SpecRowItem[] = [
    {
      label: t("vehicleForm.initialMileageLabel"),
      value: formatDistance(
        vehicle?.initial_mileage,
        language,
        distanceUnitLabel,
      ),
    },
    {
      label: t("vehicleForm.mileageLabel"),
      value: formatDistance(vehicle?.mileage, language, distanceUnitLabel),
    },
  ];

  const groups: SpecGroupItem[] = [
    { title: t("dashboard.specIdentity"), rows: identityRows },
    { title: t("dashboard.specPowertrain"), rows: powertrainRows },
    { title: t("dashboard.specMileage"), rows: mileageRows },
  ];

  const optionalFields = [
    vehicle?.vin,
    vehicle?.license_plate,
    vehicle?.fuel_type,
    vehicle?.engine_capacity,
    vehicle?.power_hp,
    vehicle?.transmission,
    vehicle?.drive_type,
    vehicle?.first_registration_date,
  ];
  const missingCount = optionalFields.filter(
    (value) => !isFilled(value),
  ).length;
  const showCompleteCta = missingCount >= 2 && Boolean(vehicleId);

  const onCompleteSpec = useCallback(() => {
    navigation.navigate("VehicleForm", { vehicleId });
  }, [navigation, vehicleId]);

  const onCopyValue = useCallback(async (text: string, message: string) => {
    await Clipboard.setStringAsync(text);
    toastSuccess(message);
  }, []);

  return (
    <DashboardSection title={t("dashboard.specification")}>
      <View
        style={[
          styles.infoCard,
          specStyles.card,
          { backgroundColor: theme.colors.card },
        ]}
      >
        {groups.map((group, groupIndex) => (
          <SpecGroup
            key={group.title}
            title={group.title}
            rows={group.rows}
            showTopBorder={groupIndex > 0}
            styles={specStyles}
            theme={appTheme}
            onCopyValue={onCopyValue}
          />
        ))}
      </View>

      {showCompleteCta ? (
        <Pressable
          onPress={onCompleteSpec}
          accessibilityRole="button"
          style={({ pressed }) => [
            specStyles.completeCta,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={specStyles.completeCtaText}>
            {t("dashboard.completeSpecification")}
          </Text>
        </Pressable>
      ) : null}
    </DashboardSection>
  );
}

function SpecGroup({
  title,
  rows,
  showTopBorder,
  styles,
  theme,
  onCopyValue,
}: {
  title: string;
  rows: SpecRowItem[];
  showTopBorder: boolean;
  styles: ReturnType<typeof makeSpecStyles>;
  theme: ReturnType<typeof useTheme>["theme"];
  onCopyValue: (text: string, message: string) => void | Promise<void>;
}) {
  return (
    <View
      style={[
        styles.group,
        showTopBorder && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingTop: theme.spacing.md,
        },
      ]}
    >
      <Text style={styles.groupTitle}>{title}</Text>
      {rows.map((row) => {
        const isCopyable = Boolean(row.copyText);
        const rowContent = (
          <>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={[styles.rowValue, isCopyable && styles.copyableValue]}>
              {row.value}
            </Text>
          </>
        );

        if (isCopyable) {
          return (
            <Pressable
              key={row.label}
              onPress={() =>
                void onCopyValue(row.copyText!, row.copiedMessage ?? row.value)
              }
              accessibilityRole="button"
              accessibilityHint={row.copiedMessage}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              {rowContent}
            </Pressable>
          );
        }

        return (
          <View key={row.label} style={styles.row}>
            {rowContent}
          </View>
        );
      })}
    </View>
  );
}

const makeSpecStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
    },
    group: {
      gap: theme.spacing.xs / 2,
    },
    groupTitle: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    row: {
      minHeight: 32,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    rowLabel: {
      flexShrink: 1,
      fontSize: theme.typography.small,
      color: theme.colors.muted,
    },
    rowValue: {
      flexShrink: 1,
      textAlign: "right",
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
    },
    copyableValue: {
      textDecorationLine: "underline",
      textDecorationColor: theme.colors.muted,
    },
    completeCta: {
      minHeight: 44,
      justifyContent: "center",
    },
    completeCtaText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
    },
  });
