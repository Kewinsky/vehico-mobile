import { Dimensions, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getVehicleTypeMciIcon } from "../../../../constants/vehicleTypes";
import { Glow } from "../../../../ui/components/dashboard/Glow";
import { useTheme } from "../../../../ui/ThemeProvider";
import { VehicleCarousel } from "../components/VehicleCarousel";
import { DashboardBottomInset } from "../components/DashboardBottomInset";
import { makeDashboardScreenStyles } from "../dashboardScreenStyles";
import { OverviewPanel } from "../overview/OverviewPanel";
import { useOverviewPanelStyles } from "../overview/overviewStyles";
import { useVehicleDashboard } from "../VehicleDashboardContext";

export function VehicleDashboardOverviewScreen() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeDashboardScreenStyles(theme, insets);
  const overviewStyles = useOverviewPanelStyles();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const vehicleImageHeight = Math.min(Math.max(windowHeight * 0.34, 280), 360);
  const dashboard = useVehicleDashboard();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 0 }]}
    >
      <Glow
        width={windowWidth}
        height={Math.round(windowHeight * 0.55)}
        mode={mode}
        variant="irregular"
        irregularOrigin="top-right"
        angle={135}
        scale={2}
        style={styles.carouselGlow}
      />
      <View
        style={[styles.vehicleImageContainer, { height: vehicleImageHeight }]}
      >
        {dashboard.photoUrls.length > 0 ? (
          <VehicleCarousel
            photoUrls={dashboard.photoUrls}
            width={windowWidth}
            height={vehicleImageHeight}
            theme={theme}
            onPhotoPress={(index) => dashboard.setFullScreenIndex(index)}
          />
        ) : (
          <View style={styles.vehicleImagePlaceholder}>
            <MaterialCommunityIcons
              name={
                getVehicleTypeMciIcon(dashboard.vehicle?.type ?? "car") as any
              }
              size={theme.spacing.xl * 2}
              color={theme.colors.muted}
            />
          </View>
        )}
      </View>

      <OverviewPanel
        windowWidth={windowWidth}
        styles={overviewStyles}
        vehicleId={dashboard.vehicleId}
        vehicle={dashboard.vehicle}
        navigation={dashboard.navigation}
        t={dashboard.t}
        language={dashboard.i18n.language}
        theme={theme}
        isPremium={dashboard.isPremium}
        publicReportUrl={dashboard.publicReportUrl}
        onShowQrCode={dashboard.handleShowPublicReportQr}
        mileageStaleTitle={dashboard.mileageStaleTitle}
        handleQuickMileageEdit={dashboard.handleQuickMileageEdit}
        insuranceCalloutCopy={dashboard.insuranceCalloutCopy}
        acCalloutCopy={dashboard.acCalloutCopy}
        inspectionCalloutCopy={dashboard.inspectionCalloutCopy}
        oilChangeDueState={dashboard.oilChangeDueState}
        oilBannerCopy={dashboard.oilBannerCopy}
        handleOilChangeDone={dashboard.handleOilChangeDone}
        handleOilChangeBook={dashboard.handleOilChangeBook}
        oilBookLoading={dashboard.oilBookLoading}
        pendingWorkshopCount={dashboard.pendingWorkshopCount}
        handlePendingWorkshopPress={dashboard.handlePendingWorkshopPress}
        quickMetrics={dashboard.quickMetrics}
        currency={dashboard.currency}
        distanceUnitLabel={dashboard.distanceUnitLabel}
        handleAddService={dashboard.handleAddService}
        handleAddFuel={dashboard.handleAddFuel}
        handleAddReminder={dashboard.handleAddReminder}
        upcomingReminders={dashboard.upcomingReminders}
        insuranceDaysUntil={dashboard.insuranceDaysUntil}
        acDaysUntil={dashboard.acDaysUntil}
        inspectionDaysUntil={dashboard.inspectionDaysUntil}
        openFormalitiesDateEditor={dashboard.openFormalitiesDateEditor}
        fittedTiresLines={dashboard.fittedTiresLines}
        fittedWheelsLines={dashboard.fittedWheelsLines}
      />
      <DashboardBottomInset />
    </ScrollView>
  );
}
