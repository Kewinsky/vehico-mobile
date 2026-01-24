import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { getVehicle } from "../services/vehicles/vehiclesRepo";
import type { Vehicle } from "../types/domain";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import {
  generatePublicPage,
  getPublicPageUrl,
  getPublicReportCount,
} from "../services/publicPages/publicPagesRepo";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const MAX_FREE_REPORTS = 3;

  const load = useCallback(async () => {
    try {
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      const count = await getPublicReportCount(vehicleId);
      setReportCount(count);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  async function handleGenerateReport() {
    if (reportCount !== null && reportCount >= MAX_FREE_REPORTS) {
      // Show payment screen
      Alert.alert(
        t("publicReport.paymentRequiredTitle"),
        t("publicReport.paymentRequiredBody", { maxFree: MAX_FREE_REPORTS }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("publicReport.purchaseButton"),
            onPress: () => {
              // TODO: Navigate to payment screen
              toastError(t("publicReport.paymentNotImplemented"));
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      t("publicReport.confirmTitle"),
      t("publicReport.confirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("publicReport.generateButton"),
          onPress: async () => {
            try {
              setGenerating(true);
              const publicPage = await generatePublicPage(vehicleId);
              const url = await getPublicPageUrl(publicPage.public_id);
              // Refresh report count
              const count = await getPublicReportCount(vehicleId);
              setReportCount(count);
              navigation.navigate("PublicReportOptions", {
                url,
                vehicleTitle,
              });
            } catch (e: any) {
              toastError(e?.message ?? t("common.error"));
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("publicReport.title")}</Text>
          <Text style={styles.subtitle}>
            {t("publicReport.subtitle", { vehicleTitle })}
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        {reportCount !== null && (
          <View style={styles.counterCard}>
            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>
                {t("publicReport.reportsUsed")}
              </Text>
              <Text style={styles.counterValue}>
                {reportCount} / {MAX_FREE_REPORTS}
              </Text>
            </View>
            {reportCount >= MAX_FREE_REPORTS && (
              <Text style={styles.counterHint}>
                {t("publicReport.maxReportsReached")}
              </Text>
            )}
          </View>
        )}

        {reportCount !== null && reportCount < MAX_FREE_REPORTS && (
          <View style={{ height: theme.spacing.md }} />
        )}
        <View style={{ height: theme.spacing.md }} />

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={theme.colors.accent}
            />
            <Text style={styles.infoTitle}>
              {t("publicReport.infoTitle")}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {t("publicReport.infoText")}
          </Text>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Button
          onPress={handleGenerateReport}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={{ color: "#000000", fontWeight: "700" }}>
                {t("common.loading")}
              </Text>
            </View>
          ) : (
            t("publicReport.generateButton")
          )}
        </Button>
        <View style={{ height: theme.spacing.xs }} />
        <Button
          onPress={() =>
            navigation.navigate("PublicReportHistory", {
              vehicleId,
            })
          }
          variant="ghost"
        >
          {t("publicReport.historyButton")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    header: {
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
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    infoHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.muted,
    },
    counterCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    counterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    counterLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.fg,
    },
    counterValue: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.accent,
    },
    counterHint: {
      fontSize: 12,
      color: theme.colors.muted,
      fontStyle: "italic",
    },
  });
