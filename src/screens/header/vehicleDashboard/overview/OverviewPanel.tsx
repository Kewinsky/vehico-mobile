import { View } from "react-native";

import { useDashboardSectionOrder } from "../useDashboardSectionOrder";
import { OverviewCallouts } from "./OverviewCallouts";
import { OverviewVehicleHeader } from "./OverviewVehicleHeader";
import { FormalitiesSection } from "./sections/FormalitiesSection";
import { NotesSection } from "./sections/NotesSection";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { QuickMetricsSection } from "./sections/QuickMetricsSection";
import { SpecificationSection } from "./sections/SpecificationSection";
import { UpcomingRemindersSection } from "./sections/UpcomingRemindersSection";
import { WheelsSection } from "./sections/WheelsSection";
import type { OverviewPanelProps } from "./types";

export function OverviewPanel(props: OverviewPanelProps) {
  const { windowWidth, styles } = props;
  const { orderedIds } = useDashboardSectionOrder("overview");

  const sectionRenderers = {
    quickMetrics: () => <QuickMetricsSection {...props} />,
    specification: () => <SpecificationSection {...props} />,
    quickActions: () => <QuickActionsSection {...props} />,
    upcomingReminders: () => <UpcomingRemindersSection {...props} />,
    formalities: () => <FormalitiesSection {...props} />,
    wheels: () => <WheelsSection {...props} />,
    notes: () => <NotesSection {...props} />,
  } as const;

  return (
    <View style={[styles.page, { width: windowWidth }]}>
      <OverviewVehicleHeader
        styles={styles}
        vehicle={props.vehicle}
        theme={props.theme}
        isPremium={props.isPremium}
        publicReportUrl={props.publicReportUrl}
        onCopyVin={props.onCopyVin}
        onShowQrCode={props.onShowQrCode}
      />

      <OverviewCallouts
        t={props.t}
        theme={props.theme}
        isPremium={props.isPremium}
        vehicle={props.vehicle}
        mileageStaleTitle={props.mileageStaleTitle}
        handleQuickMileageEdit={props.handleQuickMileageEdit}
        insuranceCalloutCopy={props.insuranceCalloutCopy}
        inspectionCalloutCopy={props.inspectionCalloutCopy}
        oilChangeDueState={props.oilChangeDueState}
        oilBannerCopy={props.oilBannerCopy}
        handleOilChangeDone={props.handleOilChangeDone}
        handleOilChangeBook={props.handleOilChangeBook}
        oilBookLoading={props.oilBookLoading}
        openFormalitiesDateEditor={props.openFormalitiesDateEditor}
      />

      <View style={styles.panelSections}>
        {orderedIds.map((sectionId) => {
          const render = sectionRenderers[sectionId];
          return <View key={sectionId}>{render()}</View>;
        })}
      </View>
    </View>
  );
}
