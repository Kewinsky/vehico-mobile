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

type SpecRowItem = {
  label: string;
  value: string;
  /** Raw string to put on the clipboard; when set, the value is tappable. */
  copyText?: string;
  copiedMessage?: string;
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

export function SpecificationSection({
  styles,
  theme,
  t,
  vehicle,
  language,
  vehicleId,
  navigation,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "vehicle"
  | "language"
  | "vehicleId"
  | "navigation"
>) {
  const { theme: appTheme } = useTheme();
  const specStyles = makeSpecStyles(appTheme);

  const fuelValue =
    vehicle?.fuel_type != null
      ? enumLabel("vehicleForm.fuelType", vehicle.fuel_type as FuelType, t)
      : null;
  const transmissionValue =
    vehicle?.transmission != null
      ? enumLabel(
          "vehicleForm.transmission",
          vehicle.transmission as TransmissionType,
          t,
        )
      : null;

  const engineRows: SpecRowItem[] = [
    vehicle
      ? {
          label: t("vehicleForm.yearLabel"),
          value: String(vehicle.production_year),
        }
      : null,
    vehicle?.engine_capacity
      ? {
          label: t("vehicleForm.engineCapacityLabel"),
          value: `${groupThousands(vehicle.engine_capacity, 0, language)} cm³`,
        }
      : null,
    vehicle?.power_hp
      ? {
          label: t("vehicleForm.powerHpLabel"),
          value: `${groupThousands(vehicle.power_hp, 0, language)} ${t("vehicleForm.powerOutputUnit")}`,
        }
      : null,
    fuelValue
      ? { label: t("vehicleForm.fuelTypeLabel"), value: fuelValue }
      : null,
  ].filter((row): row is SpecRowItem => row != null);

  const drivetrainRows: SpecRowItem[] = [
    transmissionValue
      ? { label: t("vehicleForm.transmissionLabel"), value: transmissionValue }
      : null,
    vehicle?.drive_type
      ? { label: t("vehicleForm.driveTypeLabel"), value: vehicle.drive_type }
      : null,
  ].filter((row): row is SpecRowItem => row != null);

  const vin = vehicle?.vin?.trim() || null;
  const plate = vehicle?.license_plate?.trim() || null;
  const plateCopyText = plate ? plate.replace(/\s+/g, "") : null;
  const firstRegistrationRaw = vehicle?.first_registration_date?.trim() || null;
  const firstRegistration = formatShortDisplayDate(
    firstRegistrationRaw,
    language,
  );
  const identityRows: SpecRowItem[] = [];
  if (vin) {
    identityRows.push({
      label: t("vehicleForm.vinLabel"),
      value: vin,
      copyText: vin,
      copiedMessage: t("dashboard.copiedVin"),
    });
  }
  if (plate && plateCopyText) {
    identityRows.push({
      label: t("vehicleForm.licensePlateLabel"),
      value: plate,
      copyText: plateCopyText,
      copiedMessage: t("dashboard.copiedLicensePlate"),
    });
  }
  if (firstRegistrationRaw && firstRegistration !== "–") {
    identityRows.push({
      label: t("vehicleForm.firstRegistrationDateLabel"),
      value: firstRegistration,
      copyText: firstRegistration,
      copiedMessage: t("dashboard.copiedRegistrationDate"),
    });
  }

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
  const missingCount = optionalFields.filter((value) => !isFilled(value)).length;
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
      <View style={specStyles.stack}>
        <SpecCard
          title={t("dashboard.specIdentity")}
          rows={identityRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
          onCopyValue={onCopyValue}
        />
        <SpecCard
          title={t("dashboard.specEngine")}
          rows={engineRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
          onCopyValue={onCopyValue}
        />
        <SpecCard
          title={t("dashboard.specDrivetrain")}
          rows={drivetrainRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
          onCopyValue={onCopyValue}
        />

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
      </View>
    </DashboardSection>
  );
}

function SpecCard({
  title,
  rows,
  cardStyle,
  styles,
  theme,
  onCopyValue,
}: {
  title: string;
  rows: SpecRowItem[];
  cardStyle: object;
  styles: ReturnType<typeof makeSpecStyles>;
  theme: ReturnType<typeof useTheme>["theme"];
  onCopyValue: (text: string, message: string) => void | Promise<void>;
}) {
  if (rows.length === 0) return null;

  return (
    <View style={cardStyle}>
      <View
        style={[
          styles.cardHeader,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {rows.map((row, index) => {
        const isCopyable = Boolean(row.copyText);
        const rowContent = (
          <>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text
              style={[styles.rowValue, isCopyable && styles.copyableValue]}
            >
              {row.value}
            </Text>
          </>
        );

        return (
          <View
            key={row.label}
            style={[
              styles.rowShell,
              index < rows.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            {isCopyable ? (
              <Pressable
                onPress={() =>
                  void onCopyValue(
                    row.copyText!,
                    row.copiedMessage ?? row.value,
                  )
                }
                accessibilityRole="button"
                accessibilityHint={row.copiedMessage}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={6}
              >
                {rowContent}
              </Pressable>
            ) : (
              <View style={styles.row}>{rowContent}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const makeSpecStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    stack: {
      gap: theme.spacing.sm,
    },
    card: {
      gap: 0,
    },
    cardHeader: {
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.xs / 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cardTitle: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
      letterSpacing: 0.4,
    },
    rowShell: {
      minHeight: 44,
      justifyContent: "center",
    },
    row: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    rowLabel: {
      flexShrink: 1,
      fontSize: theme.typography.body,
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
