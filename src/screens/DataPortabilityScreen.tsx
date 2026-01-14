import { useMemo, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import {
  listServiceEntries,
  createServiceEntry,
} from "../services/serviceEntries/serviceEntriesRepo";
import { listFuelingEntries } from "../services/fuel/fuelingEntriesRepo";
import { listReminders } from "../services/reminders/remindersRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function DataPortabilityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [exportingKind, setExportingKind] = useState<"json" | "csv" | null>(
    null
  );
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  async function onExportJson() {
    try {
      setExportingKind("json");
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
        title: t("dataPortability.shareTitle"),
        message: json,
      });
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setExportingKind(null);
    }
  }

  async function onExportCsv() {
    try {
      setExportingKind("csv");
      const serviceEntries = await listServiceEntries(vehicleId);

      const header = [
        "service_date",
        "title",
        "description",
        "mileage",
        "cost",
      ];
      const rows = serviceEntries.map((e) => [
        csvEscape(String(e.service_date).slice(0, 10)),
        csvEscape(e.title ?? ""),
        csvEscape(e.description ?? ""),
        csvEscape(e.mileage ?? ""),
        csvEscape(e.cost ?? ""),
      ]);

      const csvText = [header.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );

      await Share.share({
        title: t("dataPortability.shareTitle"),
        message: csvText,
      });
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setExportingKind(null);
    }
  }

  async function onImportServiceEntries() {
    try {
      if (importing) return;
      const raw = csv.trim();
      if (!raw) return;

      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
      if (lines.length < 2) throw new Error(t("dataPortability.importInvalid"));

      const header = parseCsvLine(lines[0] ?? "").map((x) => x.toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const iDate = idx("service_date");
      const iTitle = idx("title");
      const iDesc = idx("description");
      const iMileage = idx("mileage");
      const iCost = idx("cost");
      if (iDate < 0 || iTitle < 0)
        throw new Error(t("dataPortability.importMissingColumns"));

      const rows = lines.slice(1).map(parseCsvLine);
      const toCreate = rows
        .map((r) => ({
          service_date: r[iDate] ?? "",
          title: r[iTitle] ?? "",
          description: iDesc >= 0 ? r[iDesc] ?? "" : "",
          mileage:
            iMileage >= 0 && (r[iMileage] ?? "").length
              ? Number(r[iMileage])
              : null,
          cost: iCost >= 0 && (r[iCost] ?? "").length ? Number(r[iCost]) : null,
        }))
        .filter(
          (r) => r.service_date.trim().length === 10 && r.title.trim().length
        );

      if (toCreate.length === 0)
        throw new Error(t("dataPortability.importNothing"));

      Alert.alert(
        t("dataPortability.importConfirmTitle"),
        t("dataPortability.importConfirmBody", { count: toCreate.length }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("dataPortability.importAction"),
            style: "destructive",
            onPress: async () => {
              try {
                setImporting(true);
                for (const e of toCreate) {
                  await createServiceEntry({
                    vehicle_id: vehicleId,
                    service_date: e.service_date.trim(),
                    mileage: Number.isFinite(e.mileage as any)
                      ? (e.mileage as any)
                      : null,
                    title: e.title.trim(),
                    description: (e.description ?? "").trim(),
                    cost: Number.isFinite(e.cost as any)
                      ? (e.cost as any)
                      : null,
                  });
                }
                setCsv("");
                toastSuccess(
                  t("dataPortability.importDoneTitle"),
                  t("dataPortability.importDoneBody")
                );
              } catch (err: any) {
                toastError(t("common.error"), err?.message ?? String(err));
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />
      <Text style={styles.h1}>{t("dataPortability.title")}</Text>

      <View style={{ height: 18 }} />
      <Text style={styles.h2}>{t("dataPortability.exportTitle")}</Text>
      <Text style={styles.body}>{t("dataPortability.exportSubtitle")}</Text>

      <View style={{ height: 12 }} />
      <Button onPress={onExportJson} disabled={!!exportingKind || importing}>
        {exportingKind === "json"
          ? t("common.loading")
          : t("dataPortability.exportJsonAction")}
      </Button>
      <View style={{ height: 10 }} />
      <Button
        onPress={onExportCsv}
        variant="ghost"
        disabled={!!exportingKind || importing}
      >
        {exportingKind === "csv"
          ? t("common.loading")
          : t("dataPortability.exportCsvAction")}
      </Button>

      <View style={{ height: 24 }} />
      <Text style={styles.h2}>{t("dataPortability.importTitle")}</Text>
      <Text style={styles.body}>{t("dataPortability.importSubtitle")}</Text>

      <View style={{ height: 10 }} />
      <TextField
        noMarginTop
        label={t("dataPortability.importPasteLabel")}
        helperText={t("dataPortability.importColumnsHint")}
        value={csv}
        onChangeText={setCsv}
        placeholder={t("dataPortability.importPlaceholder")}
        multiline
        style={styles.multiline}
        editable={!importing && !exportingKind}
      />
      <View style={{ height: 12 }} />
      <Button
        onPress={onImportServiceEntries}
        disabled={importing || !!exportingKind}
      >
        {importing ? t("common.loading") : t("dataPortability.importAction")}
      </Button>
      <View style={{ height: 10 }} />
      <Button
        onPress={() => setCsv("")}
        variant="ghost"
        disabled={importing || !!exportingKind || csv.trim().length === 0}
      >
        {t("dataPortability.clearAction")}
      </Button>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
    h2: { fontSize: 16, fontWeight: "800", color: theme.colors.fg },
    body: { marginTop: 8, lineHeight: 22, color: theme.colors.muted },
    multiline: {
      height: 160,
      paddingTop: 12,
      textAlignVertical: "top",
    },
  });
