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
} from "../services/publicPages/publicPagesRepo";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = await getVehicle(vehicleId);
      setVehicle(v);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  async function handleGenerateReport() {
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
              navigation.navigate("PublicReportOptions", {
                url,
                vehicleTitle,
              });
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
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
          onPress={() =>
            navigation.navigate("PublicReportHistory", {
              vehicleId,
            })
          }
          variant="ghost"
        >
          {t("publicReport.historyButton")}
        </Button>

        <View style={{ height: theme.spacing.sm }} />

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
  });
