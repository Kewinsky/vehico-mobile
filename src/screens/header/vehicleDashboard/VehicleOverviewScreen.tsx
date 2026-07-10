import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout } from "../../../ui/components/layout/AppLayout";
import { NativeHeaderScrollView } from "../../../ui/components/layout/NativeHeaderScrollView";
import { OverviewPanel } from "./overview/OverviewPanel";
import { VehicleDashboardCarousel } from "./VehicleDashboardCarousel";
import { VehicleDashboardHeaderToolbars } from "./VehicleDashboardHeaderToolbars";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

export default function VehicleOverviewScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const dashboard = useVehicleDashboard();
  const {
    loading,
    theme,
    vehicle,
    vehicleId,
    windowWidth,
    isPremium,
    overviewStyles,
    publicReportUrl,
    onCopyVin,
    handleShowPublicReportQr,
    mileageStaleTitle,
    handleQuickMileageEdit,
    insuranceCalloutCopy,
    inspectionCalloutCopy,
    oilChangeDueState,
    oilBannerCopy,
    handleOilChangeDone,
    handleOilChangeBook,
    oilBookLoading,
    quickMetrics,
    currency,
    distanceUnitLabel,
    handleAddService,
    handleAddFuel,
    handleAddReminder,
    upcomingReminders,
    insuranceDaysUntil,
    inspectionDaysUntil,
    openFormalitiesDateEditor,
    fittedTiresLines,
    fittedWheelsLines,
  } = dashboard;

  return (
    <>
      <VehicleDashboardHeaderToolbars showActionsMenu />
      <AppLayout
        loading={loading}
        ready
        useNativeHeader
        useHorizontalContentInset={false}
      >
        <NativeHeaderScrollView
          paddingHorizontal={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: Math.max(
              theme.spacing.xl,
              insets.bottom + theme.spacing.md,
            ),
          }}
        >
          <VehicleDashboardCarousel />
          <OverviewPanel
            windowWidth={windowWidth}
            styles={overviewStyles}
            vehicleId={vehicleId}
            vehicle={vehicle}
            t={t}
            language={i18n.language}
            theme={theme}
            isPremium={isPremium}
            publicReportUrl={publicReportUrl}
            onCopyVin={onCopyVin}
            onShowQrCode={handleShowPublicReportQr}
            mileageStaleTitle={mileageStaleTitle}
            handleQuickMileageEdit={handleQuickMileageEdit}
            insuranceCalloutCopy={insuranceCalloutCopy}
            inspectionCalloutCopy={inspectionCalloutCopy}
            oilChangeDueState={oilChangeDueState}
            oilBannerCopy={oilBannerCopy}
            handleOilChangeDone={handleOilChangeDone}
            handleOilChangeBook={handleOilChangeBook}
            oilBookLoading={oilBookLoading}
            quickMetrics={quickMetrics}
            currency={currency}
            distanceUnitLabel={distanceUnitLabel}
            handleAddService={handleAddService}
            handleAddFuel={handleAddFuel}
            handleAddReminder={handleAddReminder}
            upcomingReminders={upcomingReminders}
            insuranceDaysUntil={insuranceDaysUntil}
            inspectionDaysUntil={inspectionDaysUntil}
            openFormalitiesDateEditor={openFormalitiesDateEditor}
            fittedTiresLines={fittedTiresLines}
            fittedWheelsLines={fittedWheelsLines}
          />
        </NativeHeaderScrollView>
      </AppLayout>
    </>
  );
}
