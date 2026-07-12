import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout } from "../../ui/components/layout/AppLayout";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { useTheme } from "../../ui/ThemeProvider";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { VehicleDashboardHeaderToolbars } from "./vehicleDashboard/VehicleDashboardHeaderToolbars";
import { VehicleDashboardVehicleHeader } from "./vehicleDashboard/VehicleDashboardVehicleHeader";
import { useVehicleDashboard } from "./vehicleDashboard/VehicleDashboardProvider";
import { StatisticsPanelContent } from "./vehicleDashboard/stats/StatisticsPanelContent";
import type { PeriodKey } from "./vehicleDashboard/stats/types";

const PERIOD_KEYS: PeriodKey[] = ["1m", "3m", "6m", "1y", "all"];

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<PeriodKey>("3m");

  const {
    loading,
    vehicle,
    isPremium,
    publicReportUrl,
    onCopyVin,
    handleShowPublicReportQr,
  } = useVehicleDashboard();

  const showInitialLoading = loading && !vehicle;

  return (
    <>
      <VehicleDashboardHeaderToolbars />
      <AppLayout
        loading={showInitialLoading}
        ready
        useNativeHeader
        useHorizontalContentInset={false}
      >
        <NativeHeaderScrollView
          paddingHorizontal={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.layout.contentPaddingHorizontal,
            paddingBottom: Math.max(
              theme.spacing.xl,
              insets.bottom + theme.spacing.md,
            ),
          }}
        >
          <VehicleDashboardVehicleHeader
            vehicle={vehicle}
            isPremium={isPremium}
            publicReportUrl={publicReportUrl}
            onCopyVin={onCopyVin}
            onShowQrCode={handleShowPublicReportQr}
          />
          <SegmentTabs<PeriodKey>
            value={period}
            options={PERIOD_KEYS.map((key) => ({
              value: key,
              label: t(`dashboard.stats.periods.${key}`),
            }))}
            onChange={setPeriod}
          />
          <StatisticsPanelContent period={period} />
        </NativeHeaderScrollView>
      </AppLayout>
    </>
  );
}
