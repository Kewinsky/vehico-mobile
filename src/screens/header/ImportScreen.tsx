import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  FUEL_TYPE_OPTIONS,
  GAS_STATION_OPTIONS,
} from "../../forms/fuelingEntryForm";
import { WORKSHOP_TYPE_OPTIONS } from "../../forms/workshopForm";
import { createFuelingEntry } from "../../services/fuel/fuelingEntriesRepo";
import { createServiceEntry } from "../../services/serviceEntries/serviceEntriesRepo";
import { createWorkshop } from "../../services/workshops/workshopsRepo";
import type {
  FuelGrade,
  GasStation,
  ServiceEntryCategory,
  WorkshopType,
} from "../../types/domain";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { Textarea } from "../../ui/components/common/Textarea";

type Props = NativeStackScreenProps<AppStackParamList, "Import">;

const IMPORT_ENTRY_TYPES = ["service", "fuel", "workshop"] as const;
type ImportEntryType = (typeof IMPORT_ENTRY_TYPES)[number];

const SERVICE_CATEGORIES = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_change",
  "other",
] as const satisfies readonly ServiceEntryCategory[];

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  const delimiter = ";";

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
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur.trim());
  return out;
}

function parseOptionalNumber(raw: string | undefined): number | null {
  const value = (raw ?? "").trim();
  if (!value.length) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredPositiveNumber(raw: string | undefined): number | null {
  const parsed = parseOptionalNumber(raw);
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

export function ImportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isPremium } = useEntitlements();
  const { vehicleId } = route.params;

  const [entryType, setEntryType] = useState<ImportEntryType>("service");
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  const entryTypeKey = `import.${entryType}` as const;

  function openEntryTypePicker() {
    if (importing) return;
    Alert.alert(
      "",
      "",
      [
        { text: t("common.cancel"), style: "cancel" },
        ...IMPORT_ENTRY_TYPES.map((type) => ({
          text: t(`import.entryTypes.${type}`),
          onPress: () => {
            setEntryType(type);
            setCsv("");
          },
        })),
      ],
      { cancelable: true },
    );
  }

  async function copyColumns() {
    try {
      const headerLine =
        t(`${entryTypeKey}.placeholder`).split(/\r?\n/)[0]?.trim() ?? "";
      if (!headerLine.length) {
        throw new Error(t("common.error"));
      }
      await Clipboard.setStringAsync(headerLine);
      toastSuccess(t("import.columnsCopied"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function runImport(count: number, createRows: () => Promise<void>) {
    Alert.alert(
      t("import.confirmTitle"),
      t(`${entryTypeKey}.confirmBody`, { count }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("import.confirmAction"),
          style: "destructive",
          onPress: async () => {
            try {
              setImporting(true);
              await createRows();
              setCsv("");
              toastSuccess(
                t("import.successTitle"),
                t(`${entryTypeKey}.successBody`),
              );
            } catch (err: any) {
              toastError(err?.message ?? t("common.error"));
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  }

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
      const rows = lines.slice(1).map(parseCsvLine);

      if (entryType === "service") {
        const iDate = idx("service_date");
        const iCategory = idx("category");
        const iTitle = idx("title");
        const iDesc = idx("description");
        const iMileage = idx("mileage");
        const iCost = idx("cost");
        if (iDate < 0 || iTitle < 0) {
          throw new Error(t("import.service.missingColumns"));
        }

        const toCreate = rows
          .map((r) => ({
            service_date: r[iDate] ?? "",
            category:
              iCategory >= 0 && (r[iCategory] ?? "").trim().length
                ? (r[iCategory] ?? "").trim().toLowerCase()
                : "other",
            title: r[iTitle] ?? "",
            description: iDesc >= 0 ? (r[iDesc] ?? "") : "",
            mileage: parseOptionalNumber(r[iMileage]),
            cost: parseOptionalNumber(r[iCost]),
          }))
          .filter(
            (r) => r.service_date.trim().length === 10 && r.title.trim().length,
          );

        if (toCreate.length === 0) {
          throw new Error(t("import.noValidEntries"));
        }

        await runImport(toCreate.length, async () => {
          for (const e of toCreate) {
            await createServiceEntry({
              vehicle_id: vehicleId,
              service_date: e.service_date.trim(),
              mileage: e.mileage,
              category: SERVICE_CATEGORIES.includes(e.category as any)
                ? (e.category as ServiceEntryCategory)
                : "other",
              title: e.title.trim(),
              description: (e.description ?? "").trim(),
              cost: e.cost,
            });
          }
        });
        return;
      }

      if (entryType === "fuel") {
        const iDate = idx("date");
        const iDistance = idx("distance");
        const iFuelAmount = idx("fuel_amount");
        const iFuelCost = idx("fuel_cost");
        const iFuelType = idx("fuel_type");
        const iGasStation = idx("gas_station");
        if (iDate < 0 || iFuelAmount < 0 || iFuelCost < 0) {
          throw new Error(t("import.fuel.missingColumns"));
        }

        const toCreate = rows
          .map((r) => {
            const fuelTypeRaw = (r[iFuelType] ?? "").trim().toLowerCase();
            const gasStationRaw = (r[iGasStation] ?? "").trim().toLowerCase();
            return {
              date: r[iDate] ?? "",
              distance: parseOptionalNumber(r[iDistance]),
              fuel_amount: parseRequiredPositiveNumber(r[iFuelAmount]),
              fuel_cost: parseRequiredPositiveNumber(r[iFuelCost]),
              fuel_type:
                fuelTypeRaw.length &&
                FUEL_TYPE_OPTIONS.includes(fuelTypeRaw as FuelGrade)
                  ? (fuelTypeRaw as FuelGrade)
                  : null,
              gas_station:
                gasStationRaw.length &&
                GAS_STATION_OPTIONS.includes(gasStationRaw as GasStation)
                  ? (gasStationRaw as GasStation)
                  : null,
            };
          })
          .filter(
            (r) =>
              r.date.trim().length === 10 &&
              r.fuel_amount != null &&
              r.fuel_cost != null,
          );

        if (toCreate.length === 0) {
          throw new Error(t("import.noValidEntries"));
        }

        await runImport(toCreate.length, async () => {
          for (const e of toCreate) {
            await createFuelingEntry({
              vehicle_id: vehicleId,
              date: e.date.trim(),
              distance: e.distance,
              fuel_amount: e.fuel_amount!,
              fuel_cost: e.fuel_cost!,
              fuel_type: e.fuel_type,
              gas_station: e.gas_station,
            });
          }
        });
        return;
      }

      const iName = idx("name");
      const iWorkshopType = idx("workshop_type");
      const iPhone = idx("phone_number");
      const iAddress = idx("address");
      if (iName < 0) {
        throw new Error(t("import.workshop.missingColumns"));
      }

      const toCreate = rows
        .map((r) => {
          const workshopTypeRaw = (r[iWorkshopType] ?? "").trim().toLowerCase();
          return {
            name: r[iName] ?? "",
            workshop_type:
              workshopTypeRaw.length &&
              WORKSHOP_TYPE_OPTIONS.includes(workshopTypeRaw as WorkshopType)
                ? (workshopTypeRaw as WorkshopType)
                : "other",
            phone_number:
              iPhone >= 0 && (r[iPhone] ?? "").trim().length
                ? (r[iPhone] ?? "").trim()
                : null,
            address:
              iAddress >= 0 && (r[iAddress] ?? "").trim().length
                ? (r[iAddress] ?? "").trim()
                : null,
          };
        })
        .filter((r) => r.name.trim().length);

      if (toCreate.length === 0) {
        throw new Error(t("import.noValidEntries"));
      }

      await runImport(toCreate.length, async () => {
        for (const e of toCreate) {
          await createWorkshop({
            name: e.name.trim(),
            workshop_type: e.workshop_type,
            phone_number: e.phone_number,
            address: e.address,
          });
        }
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <HeaderLayout
      onBack={() => navigation.goBack()}
      showProfileAvatar
      showShopIcon={!isPremium}
      footer={
        <>
          <Button
            onPress={handleImportCsv}
            disabled={importing || !csv.trim().length}
          >
            {importing
              ? t("common.loading")
              : t(`${entryTypeKey}.importButton`)}
          </Button>
          <Button
            onPress={() => setCsv("")}
            variant="ghost"
            disabled={importing || csv.trim().length === 0}
          >
            {t("import.clearButton")}
          </Button>
        </>
      }
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <NativeHeaderScrollView>
          <ContentHeader title={t("import.title")} />
          <View
            style={[
              styles.card,
              styles.cardSpaced,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.cardInner}>
              <View style={styles.entryTypeRow}>
                <View style={styles.rowLeft}>
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("import.entryTypeLabel")}
                  </Text>
                </View>
                <Pressable
                  onPress={openEntryTypePicker}
                  disabled={importing}
                  style={({ pressed }) => [
                    styles.entryTypePill,
                    { backgroundColor: theme.colors.accent },
                    pressed && !importing && { opacity: 0.85 },
                    importing && { opacity: 0.5 },
                  ]}
                >
                  <Text
                    style={[
                      styles.entryTypePillText,
                      {
                        color: "#000000",
                        fontWeight: theme.typography.fontWeight.bold,
                        fontSize: theme.typography.small,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t(`import.entryTypes.${entryType}`)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <View style={styles.cardInner}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text style={[styles.label, { color: theme.colors.muted }]}>
                  {t("import.csvLabel")}
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.colors.muted }]}>
                {t(`${entryTypeKey}.csvHint`)}
              </Text>
              <View style={{ marginTop: theme.spacing.sm }}>
                <Textarea
                  followCursor
                  value={csv}
                  onChangeText={setCsv}
                  editable={!importing}
                  multiline
                  placeholder={t(`${entryTypeKey}.placeholder`)}
                  placeholderTextColor={theme.colors.muted}
                  style={[styles.textArea, { color: theme.colors.fg }]}
                  fixedHeight={250}
                />
              </View>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => void copyColumns()}
              disabled={importing}
              style={({ pressed }) => [
                styles.actionPill,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                  opacity: pressed && !importing ? 0.8 : importing ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name="copy-outline"
                size={theme.icons.headerButton}
                color={theme.colors.accent}
              />
              <Text
                style={[styles.actionPillText, { color: theme.colors.accent }]}
              >
                {t("import.copyColumnsButton")}
              </Text>
            </Pressable>
          </View>
        </NativeHeaderScrollView>
      </TouchableWithoutFeedback>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    entryTypeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    entryTypePill: {
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      flexShrink: 0,
    },
    entryTypePillText: {
      textAlign: "center",
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    actionPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
    },
    actionPillText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    card: {
      borderRadius: theme.radius.xl,
      overflow: "hidden",
    },
    cardSpaced: {
      marginBottom: theme.spacing.sm,
    },
    cardInner: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    hint: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 4,
    },
    textArea: {
      minHeight: 160,
      fontSize: theme.typography.body,
    },
  });
