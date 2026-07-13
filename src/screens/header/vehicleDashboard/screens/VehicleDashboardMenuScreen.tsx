import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";

import { OverviewVehicleHeader } from "../overview/OverviewVehicleHeader";
import { useOverviewPanelStyles } from "../overview/overviewStyles";
import { ButtonsPage } from "../pages/ButtonsPage";
import { VehicleDashboardScrollView } from "../components/VehicleDashboardScrollView";
import { useVehicleDashboard } from "../VehicleDashboardContext";
import { makeDashboardScreenStyles } from "../dashboardScreenStyles";
import { useTheme } from "../../../../ui/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function VehicleDashboardMenuScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const styles = makeDashboardScreenStyles(theme, insets);
  const overviewStyles = useOverviewPanelStyles();
  const {
    vehicle,
    isPremium,
    publicReportUrl,
    onCopyVin,
    handleShowPublicReportQr,
    tiles,
    activeRemindersCount,
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
      </View>
      <ButtonsPage
        windowWidth={windowWidth}
        styles={styles}
        theme={theme}
        tiles={tiles}
        activeRemindersCount={activeRemindersCount}
      />
    </VehicleDashboardScrollView>
  );
}
