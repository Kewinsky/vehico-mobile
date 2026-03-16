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
import { createServiceEntry } from "../../services/serviceEntries/serviceEntriesRepo";
import { HeaderLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { Textarea } from "../../ui/components/common/Textarea";

type Props = NativeStackScreenProps<AppStackParamList, "Import">;

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

export function ImportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isPremium } = useEntitlements();
  const { vehicleId } = route.params;

  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  async function copyColumns() {
    try {
      await Clipboard.setStringAsync(t("import.columnsToCopy"));
      toastSuccess(t("import.columnsCopied"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
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
          description: iDesc >= 0 ? (r[iDesc] ?? "") : "",
          mileage:
            iMileage >= 0 && (r[iMileage] ?? "").length
              ? Number(r[iMileage])
              : null,
          cost: iCost >= 0 && (r[iCost] ?? "").length ? Number(r[iCost]) : null,
        }))
        .filter(
          (r) => r.service_date.trim().length === 10 && r.title.trim().length,
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
                    category: (
                      [
                        "maintenance",
                        "repair",
                        "inspection",
                        "upgrade",
                        "oil_change",
                        "other",
                      ] as const
                    ).includes(e.category as any)
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
                toastSuccess(t("import.successTitle"), t("import.successBody"));
              } catch (err: any) {
                toastError(err?.message ?? t("common.error"));
              } finally {
                setImporting(false);
              }
            },
          },
        ],
      );
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
            {importing ? t("common.loading") : t("import.importButton")}
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
                {t("import.csvHint")}
              </Text>
              <View style={{ marginTop: theme.spacing.sm }}>
                <Textarea
                  followCursor
                  value={csv}
                  onChangeText={setCsv}
                  editable={!importing}
                  multiline
                  placeholder={t("import.placeholder")}
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
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    cardInner: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
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
