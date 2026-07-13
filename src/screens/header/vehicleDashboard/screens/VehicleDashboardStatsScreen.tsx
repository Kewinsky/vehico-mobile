import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OverviewVehicleHeader } from "../overview/OverviewVehicleHeader";
import { useOverviewPanelStyles } from "../overview/overviewStyles";
import { VehicleDashboardScrollView } from "../components/VehicleDashboardScrollView";
import { StatisticsPanel } from "../stats/StatisticsPanel";
import { StatisticsPeriodTabs } from "../stats/StatisticsPeriodTabs";
import type { PeriodKey } from "../stats/types";
import { makeDashboardScreenStyles } from "../dashboardScreenStyles";
import { useVehicleDashboard } from "../VehicleDashboardContext";
import { useTheme } from "../../../../ui/ThemeProvider";

export function VehicleDashboardStatsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const styles = makeDashboardScreenStyles(theme, insets);
  const overviewStyles = useOverviewPanelStyles();
  const [period, setPeriod] = useState<PeriodKey>("3m");
  const {
    vehicleId,
    vehicle,
    serviceEntries,
    fuelingEntries,
    navigation,
    isPremium,
    publicReportUrl,
    onCopyVin,
    handleShowPublicReportQr,
  } = useVehicleDashboard();

  return (
    <VehicleDashboardScrollView>
      <View
        style={{
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
        }}
      >
        <OverviewVehicleHeader
          styles={overviewStyles}
          vehicle={vehicle}
          theme={theme}
          isPremium={isPremium}
          publicReportUrl={publicReportUrl}
          onCopyVin={onCopyVin}
          onShowQrCode={handleShowPublicReportQr}
          showPublicQr={false}
        />
        <View style={styles.periodTabs}>
          <StatisticsPeriodTabs value={period} onChange={setPeriod} />
        </View>
      </View>
      <View style={[styles.page, { width: windowWidth }]}>
        <StatisticsPanel
          vehicleId={vehicleId}
          period={period}
          vehicle={vehicle}
          serviceEntries={serviceEntries}
          fuelingEntries={fuelingEntries}
          navigation={navigation}
        />
      </View>
    </VehicleDashboardScrollView>
  );
}
