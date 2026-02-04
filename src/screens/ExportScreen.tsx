import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share } from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "Export">;

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

export function ExportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

  async function handleExportJson() {
    try {
      setExporting("json");
      const [vehicle, service_entries, fueling_entries, reminders] =
        await Promise.all([
          getVehicle(vehicleId),
          listServiceEntries(vehicleId),
          listFuelingEntries(vehicleId),
          listReminders(vehicleId),
        ]);

      const payload = {
        exported_at: new Date().toISOString(),
        vehicle,
        service_entries,
        fueling_entries,
        reminders,
      };

      const json = JSON.stringify(payload, null, 2);
      await Share.share({
        title: t("export.shareTitle"),
        message: json,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setExporting(null);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting("csv");
      const serviceEntries = await listServiceEntries(vehicleId);

      const header = [
        "service_date",
        "category",
        "title",
        "description",
        "mileage",
        "cost",
      ];
      const rows = serviceEntries.map((e) => [
        csvEscape(String(e.service_date).slice(0, 10)),
        csvEscape((e as any).category ?? "other"),
        csvEscape(e.title ?? ""),
        csvEscape(e.description ?? ""),
        csvEscape(e.mileage ?? ""),
        csvEscape(e.cost ?? ""),
      ]);

      const csvText = [header.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );

      await Share.share({
        title: t("export.shareTitle"),
        message: csvText,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setExporting(null);
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("export.title")}</Text>
        </View>
      </View>
      <View style={styles.wrap}>
        <Button
          onPress={handleExportJson}
          variant="ghost"
          disabled={!!exporting}
        >
          {exporting === "json" ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            t("export.jsonButton")
          )}
        </Button>
        <Text style={styles.description}>{t("export.jsonDescription")}</Text>
        <View style={{ height: theme.spacing.sm }} />
        <Button
          onPress={handleExportCsv}
          variant="ghost"
          disabled={!!exporting}
        >
          {exporting === "csv" ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            t("export.csvButton")
          )}
        </Button>
        <Text style={styles.description}>{t("export.csvDescription")}</Text>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    wrap: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    description: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      marginTop: theme.spacing.xs / 2,
    },
  });
