import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { DashboardStackParamList } from "./types";
import { VehicleDashboardScreen } from "../../screens/VehicleDashboardScreen";
import { VehicleDetailScreen } from "../../screens/VehicleDetailScreen";
import { DocumentsScreen } from "../../screens/DocumentsScreen";
import { FuelScreen } from "../../screens/FuelScreen";
import { FuelingEntryFormScreen } from "../../screens/FuelingEntryFormScreen";
import { RemindersScreen } from "../../screens/RemindersScreen";
import { ReminderFormScreen } from "../../screens/ReminderFormScreen";
import { ReminderDetailScreen } from "../../screens/ReminderDetailScreen";
import { ServiceEntryDetailScreen } from "../../screens/ServiceEntryDetailScreen";
import { ServiceEntryFormScreen } from "../../screens/ServiceEntryFormScreen";
import { ShareScreen } from "../../screens/ShareScreen";
import { StatisticsScreen } from "../../screens/StatisticsScreen";
import { MarketplaceScreen } from "../../screens/MarketplaceScreen";
import { MarketplaceConfigureScreen } from "../../screens/MarketplaceConfigureScreen";
import { MarketplaceSummaryScreen } from "../../screens/MarketplaceSummaryScreen";
import { MarketplacePostOptionsScreen } from "../../screens/MarketplacePostOptionsScreen";
import { MarketplacePostScreen } from "../../screens/MarketplacePostScreen";
import { MarketplacePostHistoryScreen } from "../../screens/MarketplacePostHistoryScreen";
import { MarketplacePostEditScreen } from "../../screens/MarketplacePostEditScreen";
import { PublicReportScreen } from "../../screens/PublicReportScreen";
import { PublicReportConfigureScreen } from "../../screens/PublicReportConfigureScreen";
import { PublicReportSummaryScreen } from "../../screens/PublicReportSummaryScreen";
import { PublicReportOptionsScreen } from "../../screens/PublicReportOptionsScreen";
import { PublicReportHistoryScreen } from "../../screens/PublicReportHistoryScreen";
import { ManageVehicleScreen } from "../../screens/ManageVehicleScreen";
import { ManageVehicleEditScreen } from "../../screens/ManageVehicleEditScreen";
import { DataPortabilityScreen } from "../../screens/DataPortabilityScreen";
import { ExportScreen } from "../../screens/ExportScreen";
import { ImportScreen } from "../../screens/ImportScreen";
import { AddAttachmentScreen } from "../../screens/AddAttachmentScreen";
import { WheelsOverviewScreen } from "../../screens/WheelsOverviewScreen";
import { TiresListScreen } from "../../screens/TiresListScreen";
import { WheelsListScreen } from "../../screens/WheelsListScreen";
import { TireDetailScreen } from "../../screens/TireDetailScreen";
import { WheelDetailScreen } from "../../screens/WheelDetailScreen";
import { TireFormScreen } from "../../screens/TireFormScreen";
import { WheelFormScreen } from "../../screens/WheelFormScreen";
import { WorkshopsScreen } from "../../screens/WorkshopsScreen";
import { WorkshopDetailScreen } from "../../screens/WorkshopDetailScreen";
import { WorkshopFormScreen } from "../../screens/WorkshopFormScreen";

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="VehicleDashboard"
        component={VehicleDashboardScreen}
      />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Fuel" component={FuelScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
      <Stack.Screen
        name="FuelingEntryForm"
        component={FuelingEntryFormScreen}
      />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="ReminderForm" component={ReminderFormScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
      <Stack.Screen name="Share" component={ShareScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen
        name="MarketplaceConfigure"
        component={MarketplaceConfigureScreen}
      />
      <Stack.Screen
        name="MarketplaceSummary"
        component={MarketplaceSummaryScreen}
      />
      <Stack.Screen
        name="MarketplacePostOptions"
        component={MarketplacePostOptionsScreen}
      />
      <Stack.Screen name="MarketplacePost" component={MarketplacePostScreen} />
      <Stack.Screen
        name="MarketplacePostHistory"
        component={MarketplacePostHistoryScreen}
      />
      <Stack.Screen
        name="MarketplacePostEdit"
        component={MarketplacePostEditScreen}
      />
      <Stack.Screen name="PublicReport" component={PublicReportScreen} />
      <Stack.Screen
        name="PublicReportConfigure"
        component={PublicReportConfigureScreen}
      />
      <Stack.Screen
        name="PublicReportSummary"
        component={PublicReportSummaryScreen}
      />
      <Stack.Screen
        name="PublicReportOptions"
        component={PublicReportOptionsScreen}
      />
      <Stack.Screen
        name="PublicReportHistory"
        component={PublicReportHistoryScreen}
      />
      <Stack.Screen name="ManageVehicle" component={ManageVehicleScreen} />
      <Stack.Screen
        name="ManageVehicleEdit"
        component={ManageVehicleEditScreen}
      />
      <Stack.Screen name="DataPortability" component={DataPortabilityScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="Import" component={ImportScreen} />
      <Stack.Screen name="AddAttachment" component={AddAttachmentScreen} />
      <Stack.Screen
        name="ServiceEntryDetail"
        component={ServiceEntryDetailScreen}
      />
      <Stack.Screen
        name="ServiceEntryForm"
        component={ServiceEntryFormScreen}
      />
      <Stack.Screen name="Wheels" component={WheelsOverviewScreen} />
      <Stack.Screen name="TiresList" component={TiresListScreen} />
      <Stack.Screen name="WheelsList" component={WheelsListScreen} />
      <Stack.Screen name="TireDetail" component={TireDetailScreen} />
      <Stack.Screen name="WheelDetail" component={WheelDetailScreen} />
      <Stack.Screen name="TireForm" component={TireFormScreen} />
      <Stack.Screen name="WheelForm" component={WheelFormScreen} />
      <Stack.Screen name="Workshops" component={WorkshopsScreen} />
      <Stack.Screen name="WorkshopDetail" component={WorkshopDetailScreen} />
      <Stack.Screen name="WorkshopForm" component={WorkshopFormScreen} />
    </Stack.Navigator>
  );
}
