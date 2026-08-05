import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { Vehicle } from "../../types/domain";
import {
  getWorkshopIntakeUrl,
  regenerateVehicleIntakeToken,
  setVehicleIntakeEnabled,
  countPendingWorkshopEntries,
} from "../../services/workshopIntake/workshopIntakeRepo";
import { getVehicle } from "../../services/vehicles/vehiclesRepo";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts/HeaderLayout";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormSwitch } from "../../ui/components/common/FormSwitch";
import { Button } from "../../ui/components/common/Button";
import { BrandedQrCode } from "../../ui/components/branding/BrandedQrCode";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { useTheme } from "../../ui/ThemeProvider";
import type { AppTheme } from "../../ui/theme";
import { toastCaughtError, toastSuccess } from "../../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopIntake">;

export function WorkshopIntakeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const { width } = useWindowDimensions();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const qrSize = useMemo(() => {
    const max = 240;
    const min = 160;
    const available =
      width -
      theme.layout.contentPaddingHorizontal * 2 -
      theme.spacing.md * 2 -
      2;
    return Math.max(min, Math.min(max, Math.floor(available)));
  }, [width, theme.layout.contentPaddingHorizontal, theme.spacing.md]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      try {
        if (opts?.showLoading !== false) setLoading(true);
        const [v, pending] = await Promise.all([
          getVehicle(vehicleId),
          countPendingWorkshopEntries(vehicleId),
        ]);
        setVehicle(v);
        setPendingCount(pending);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        if (opts?.showLoading !== false) setLoading(false);
      }
    },
    [vehicleId, t],
  );

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => load({ showLoading: false }),
  });

  const handleToggle = useCallback(
    async (value: boolean) => {
      setToggling(true);
      try {
        const updated = await setVehicleIntakeEnabled(vehicleId, value);
        setVehicle(updated);
      } catch (e: any) {
        toastCaughtError(e, t("common.error"));
      } finally {
        setToggling(false);
      }
    },
    [vehicleId, t],
  );

  const handleCopyLink = useCallback(async () => {
    if (!vehicle?.intake_token) return;
    try {
      await Clipboard.setStringAsync(
        getWorkshopIntakeUrl(vehicle.intake_token),
      );
      toastSuccess(t("workshopIntake.linkCopied"));
    } catch (e: any) {
      toastCaughtError(e, t("common.error"));
    }
  }, [vehicle?.intake_token, t]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      t("workshopIntake.regenerateTitle"),
      t("workshopIntake.regenerateConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workshopIntake.regenerate"),
          style: "destructive",
          onPress: async () => {
            setRegenerating(true);
            try {
              const updated = await regenerateVehicleIntakeToken(vehicleId);
              setVehicle(updated);
              toastSuccess(t("workshopIntake.regenerated"));
            } catch (e: any) {
              toastCaughtError(e, t("common.error"));
            } finally {
              setRegenerating(false);
            }
          },
        },
      ],
    );
  }, [vehicleId, t]);

  const intakeUrl =
    vehicle?.intake_enabled && vehicle.intake_token
      ? getWorkshopIntakeUrl(vehicle.intake_token)
      : null;

  return (
    <HeaderLayout loading={loading} onBack={() => navigation.goBack()}>
      <NativeHeaderScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <ContentHeader
          title={t("workshopIntake.title")}
          subtitle={t("workshopIntake.subtitle")}
        />

        {loading ? (
          <LoadingIndicator />
        ) : (
          <View style={styles.content}>
            <Card>
              <CardRow>
                <Text style={styles.toggleLabel}>
                  {t("workshopIntake.enable")}
                </Text>
                <FormSwitch
                  value={vehicle?.intake_enabled ?? false}
                  onValueChange={(value) => void handleToggle(value)}
                  disabled={toggling}
                />
              </CardRow>
            </Card>

            {intakeUrl ? (
              <>
                <View style={styles.qrWrap}>
                  <BrandedQrCode value={intakeUrl} size={qrSize} />
                </View>
                <Text style={styles.qrHint}>{t("workshopIntake.qrHint")}</Text>
                <Button variant="ghost" onPress={() => void handleCopyLink()}>
                  {t("workshopIntake.copyLink")}
                </Button>
                <Button
                  variant="ghost"
                  onPress={handleRegenerate}
                  disabled={regenerating}
                  loading={regenerating}
                >
                  {t("workshopIntake.regenerate")}
                </Button>
              </>
            ) : (
              <Text style={styles.disabledHint}>
                {t("workshopIntake.disabledHint")}
              </Text>
            )}

            <Button
              variant="ghost"
              onPress={() =>
                navigation.navigate("PendingWorkshopEntries", { vehicleId })
              }
            >
              {pendingCount > 0
                ? t("workshopIntake.pendingWithCount", {
                    count: pendingCount,
                  })
                : t("workshopIntake.pending")}
            </Button>
          </View>
        )}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.md,
    },
    toggleLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    qrWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    qrHint: {
      textAlign: "center",
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
      color: theme.colors.muted,
      paddingHorizontal: theme.spacing.md,
    },
    disabledHint: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
      color: theme.colors.muted,
    },
  });
