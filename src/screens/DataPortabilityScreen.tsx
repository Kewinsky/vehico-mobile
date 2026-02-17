import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Share } from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
import { listVehicleWheels } from "../services/wheels/wheelsRepo";
import { listVehicleTires } from "../services/tires/tiresRepo";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { Screen } from "../ui/components/Screen";
import { Tile } from "../ui/components/Tile";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "DataPortability">;

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (
    raw.includes('"') ||
    raw.includes(",") ||
    raw.includes("\n") ||
    raw.includes("\r")
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

type CsvDataType =
  | "service_entries"
  | "fueling_entries"
  | "reminders"
  | "wheels"
  | "tires"
  | "workshops";

export function DataPortabilityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium, remindersLimit, workshopsLimit, wheelsPerVehicleLimit, tiresPerVehicleLimit } =
    useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [exporting, setExporting] = useState(false);

  function showExportFormatAlert() {
    Alert.alert(t("dataPortability.exportFormatTitle"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("dataPortability.exportFormatJson"),
        onPress: () => handleExportJson(),
      },
      {
        text: t("dataPortability.exportFormatCsv"),
        onPress: () => showCsvDataTypeAlert(),
      },
    ]);
  }

  function showCsvDataTypeAlert() {
    Alert.alert(t("dataPortability.exportCsvDataTypeTitle"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("dataPortability.exportCsvServiceEntries"),
        onPress: () => handleExportCsv("service_entries"),
      },
      {
        text: t("dataPortability.exportCsvFueling"),
        onPress: () => handleExportCsv("fueling_entries"),
      },
      {
        text: t("dataPortability.exportCsvReminders"),
        onPress: () => handleExportCsv("reminders"),
      },
      {
        text: t("dataPortability.exportCsvWheels"),
        onPress: () => handleExportCsv("wheels"),
      },
      {
        text: t("dataPortability.exportCsvTires"),
        onPress: () => handleExportCsv("tires"),
      },
      {
        text: t("dataPortability.exportCsvWorkshops"),
        onPress: () => handleExportCsv("workshops"),
      },
    ]);
  }

  async function handleExportJson() {
    try {
      setExporting(true);
      const [
        vehicle,
        service_entries,
        fueling_entries,
        reminders,
        vehicle_wheels,
        vehicle_tires,
        workshops,
      ] = await Promise.all([
        getVehicle(vehicleId),
        listServiceEntries(vehicleId),
        listFuelingEntries(vehicleId),
        listReminders(
          vehicleId,
          isPremium ? undefined : { limit: remindersLimit },
        ),
        listVehicleWheels(
          vehicleId,
          isPremium ? undefined : { limit: wheelsPerVehicleLimit },
        ),
        listVehicleTires(
          vehicleId,
          isPremium ? undefined : { limit: tiresPerVehicleLimit },
        ),
        listWorkshops(
          isPremium ? undefined : { limit: workshopsLimit },
        ),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        vehicle,
        service_entries,
        fueling_entries,
        reminders,
        vehicle_wheels,
        vehicle_tires,
        workshops,
      };

      const json = JSON.stringify(payload, null, 2);
      await Share.share({
        title: t("export.shareTitle"),
        message: json,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCsv(dataType: CsvDataType) {
    try {
      setExporting(true);
      if (dataType === "service_entries") {
        const rows = await listServiceEntries(vehicleId);
        const header = [
          "service_date",
          "category",
          "title",
          "description",
          "mileage",
          "cost",
        ];
        const lines = rows.map((e) => [
          csvEscape(String(e.service_date).slice(0, 10)),
          csvEscape((e as any).category ?? "other"),
          csvEscape(e.title ?? ""),
          csvEscape(e.description ?? ""),
          csvEscape(e.mileage ?? ""),
          csvEscape(e.cost ?? ""),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      } else if (dataType === "fueling_entries") {
        const rows = await listFuelingEntries(vehicleId);
        const header = [
          "date",
          "distance",
          "fuel_amount",
          "fuel_cost",
          "fuel_type",
          "gas_station",
        ];
        const lines = rows.map((e) => [
          csvEscape(String(e.date).slice(0, 10)),
          csvEscape(e.distance ?? ""),
          csvEscape(e.fuel_amount ?? ""),
          csvEscape(e.fuel_cost ?? ""),
          csvEscape(e.fuel_type ?? ""),
          csvEscape(
            e.gas_station &&
              typeof e.gas_station === "object" &&
              "name" in e.gas_station
              ? ((e.gas_station as { name?: string }).name ?? "")
              : "",
          ),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      } else if (dataType === "reminders") {
        const rows = await listReminders(
          vehicleId,
          isPremium ? undefined : { limit: remindersLimit },
        );
        const header = [
          "due_date",
          "due_mileage",
          "title",
          "notes",
          "status",
          "recurrence_interval_value",
          "recurrence_interval_unit",
          "recurrence_interval_km",
          "recurrence_anchor_mileage",
        ];
        const lines = rows.map((e) => [
          csvEscape(e.due_date ?? ""),
          csvEscape(e.due_mileage ?? ""),
          csvEscape(e.title ?? ""),
          csvEscape(e.notes ?? ""),
          csvEscape(e.status ?? ""),
          csvEscape(e.recurrence_interval_value ?? ""),
          csvEscape(e.recurrence_interval_unit ?? ""),
          csvEscape(e.recurrence_interval_km ?? ""),
          csvEscape(e.recurrence_anchor_mileage ?? ""),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      } else if (dataType === "wheels") {
        const rows = await listVehicleWheels(
          vehicleId,
          isPremium ? undefined : { limit: wheelsPerVehicleLimit },
        );
        const header = [
          "name",
          "width_inch",
          "diameter_inch",
          "et_offset",
          "bolt_pattern",
          "center_bore_mm",
          "bolt_type",
          "weight_kg",
          "is_currently_fitted",
        ];
        const lines = rows.map((e) => [
          csvEscape(e.name ?? ""),
          csvEscape(e.width_inch ?? ""),
          csvEscape(e.diameter_inch ?? ""),
          csvEscape(e.et_offset ?? ""),
          csvEscape(e.bolt_pattern ?? ""),
          csvEscape(e.center_bore_mm ?? ""),
          csvEscape(e.bolt_type ?? ""),
          csvEscape(e.weight_kg ?? ""),
          csvEscape(e.is_currently_fitted ?? false),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      } else if (dataType === "tires") {
        const rows = await listVehicleTires(
          vehicleId,
          isPremium ? undefined : { limit: tiresPerVehicleLimit },
        );
        const header = [
          "name",
          "width_mm",
          "aspect_ratio",
          "diameter_inch",
          "tire_type",
          "dot",
          "is_currently_fitted",
        ];
        const lines = rows.map((e) => [
          csvEscape(e.name ?? ""),
          csvEscape(e.width_mm ?? ""),
          csvEscape(e.aspect_ratio ?? ""),
          csvEscape(e.diameter_inch ?? ""),
          csvEscape(e.tire_type ?? ""),
          csvEscape(e.dot ?? ""),
          csvEscape(e.is_currently_fitted ?? false),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      } else {
        const rows = await listWorkshops(
          isPremium ? undefined : { limit: workshopsLimit },
        );
        const header = ["name", "workshop_type", "phone_number", "address"];
        const lines = rows.map((e) => [
          csvEscape(e.name ?? ""),
          csvEscape(e.workshop_type ?? ""),
          csvEscape(e.phone_number ?? ""),
          csvEscape(e.address ?? ""),
        ]);
        const csvText = [
          header.join(","),
          ...lines.map((r) => r.join(",")),
        ].join("\n");
        await Share.share({
          title: t("export.shareTitle"),
          message: csvText,
        });
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setExporting(false);
    }
  }

  const tiles = useMemo(
    () => [
      {
        key: "export",
        title: t("dataPortability.exportButton"),
        icon: "share" as const,
        onPress: showExportFormatAlert,
        disabled: exporting,
      },
      {
        key: "import",
        title: t("dataPortability.importButton"),
        icon: "download" as const,
        onPress: () => navigation.navigate("Import", { vehicleId }),
        disabled: false,
      },
    ],
    [t, navigation, vehicleId, exporting],
  );

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <ScreenLayout title={t("dataPortability.title")} scrollable={false}>
        <View style={styles.row}>
          {tiles.map((item) => (
            <Tile
              key={item.key}
              onPress={item.onPress}
              disabled={item.disabled}
              minHeight={130}
              title={item.title}
              icon={
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={theme.colors.accent}
                />
              }
            />
          ))}
        </View>
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
