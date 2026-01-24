import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { createServiceEntry } from "../services/serviceEntries/serviceEntriesRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "Import">;

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

export function ImportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImportCsv() {
    try {
      if (importing) return;
      const raw = csv.trim();
      if (!raw) {
        toastError(t("import.emptyCsv"));
        return;
      }

      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
      if (lines.length < 2) {
        throw new Error(t("import.invalidCsv"));
      }

      const header = parseCsvLine(lines[0] ?? "").map((x) => x.toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const iDate = idx("service_date");
      const iCategory = idx("category");
      const iTitle = idx("title");
      const iDesc = idx("description");
      const iMileage = idx("mileage");
      const iCost = idx("cost");
      if (iDate < 0 || iTitle < 0) {
        throw new Error(t("import.missingColumns"));
      }

      const rows = lines.slice(1).map(parseCsvLine);
      const toCreate = rows
        .map((r) => ({
          service_date: r[iDate] ?? "",
          category:
            iCategory >= 0 && (r[iCategory] ?? "").trim().length
              ? (r[iCategory] ?? "").trim().toLowerCase()
              : "other",
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

      if (toCreate.length === 0) {
        throw new Error(t("import.noValidEntries"));
      }

      Alert.alert(
        t("import.confirmTitle"),
        t("import.confirmBody", { count: toCreate.length }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("import.confirmAction"),
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
                    category: ([
                      "maintenance",
                      "repair",
                      "inspection",
                      "upgrade",
                      "other",
                    ] as const).includes(e.category as any)
                      ? (e.category as any)
                      : "other",
                    title: e.title.trim(),
                    description: (e.description ?? "").trim(),
                    cost: Number.isFinite(e.cost as any)
                      ? (e.cost as any)
                      : null,
                  });
                }
                setCsv("");
                toastSuccess(
                  t("import.successTitle"),
                  t("import.successBody")
                );
              } catch (err: any) {
                toastError(err?.message ?? t("common.error"));
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />
      <View style={styles.headerSection}>
        <Text style={styles.h1}>{t("import.title")}</Text>
        <Text style={styles.subtitle}>{t("import.subtitle")}</Text>
      </View>
      <View style={{ height: theme.spacing.md }} />
      <TextField
        noMarginTop
        label={t("import.csvLabel")}
        helperText={t("import.csvHint")}
        value={csv}
        onChangeText={setCsv}
        placeholder={t("import.placeholder")}
        multiline
        editable={!importing}
      />
      <View style={{ height: 12 }} />
      <Button onPress={handleImportCsv} disabled={importing || !csv.trim()}>
        {importing ? t("common.loading") : t("import.importButton")}
      </Button>
      <View style={{ height: 10 }} />
      <Button
        onPress={() => setCsv("")}
        variant="ghost"
        disabled={importing || csv.trim().length === 0}
      >
        {t("import.clearButton")}
      </Button>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    headerSection: {
      gap: theme.spacing.xs / 2,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.muted,
    },
  });
