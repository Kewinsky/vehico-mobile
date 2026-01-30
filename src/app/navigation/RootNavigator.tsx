import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../providers/AuthProvider";
import { LandingScreen } from "../../screens/LandingScreen";
import { AuthScreen } from "../../screens/AuthScreen";
import { TermsOfUseScreen } from "../../screens/TermsOfUseScreen";
import { PrivacyPolicyScreen } from "../../screens/PrivacyPolicyScreen";
import { VehiclesScreen } from "../../screens/VehiclesScreen";
import { VehicleDashboardScreen } from "../../screens/VehicleDashboardScreen";
import { VehicleDetailScreen } from "../../screens/VehicleDetailScreen";
import { VehicleFormScreen } from "../../screens/VehicleFormScreen";
import { ManageVehicleScreen } from "../../screens/ManageVehicleScreen";
import { ManageVehicleEditScreen } from "../../screens/ManageVehicleEditScreen";
import { DocumentsScreen } from "../../screens/DocumentsScreen";
import { FuelScreen } from "../../screens/FuelScreen";
import { FuelingEntryFormScreen } from "../../screens/FuelingEntryFormScreen";
import { RemindersScreen } from "../../screens/RemindersScreen";
import { ReminderFormScreen } from "../../screens/ReminderFormScreen";
import { ReminderDetailScreen } from "../../screens/ReminderDetailScreen";
import { ServiceEntryDetailScreen } from "../../screens/ServiceEntryDetailScreen";
import { ServiceEntryFormScreen } from "../../screens/ServiceEntryFormScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";
import { SettingsScreen } from "../../screens/SettingsScreen";
import { DataPortabilityScreen } from "../../screens/DataPortabilityScreen";
import { ExportScreen } from "../../screens/ExportScreen";
import { ImportScreen } from "../../screens/ImportScreen";
import { AddAttachmentScreen } from "../../screens/AddAttachmentScreen";
import { ShareScreen } from "../../screens/ShareScreen";
import { StatisticsScreen } from "../../screens/StatisticsScreen";
import { MarketplaceScreen } from "../../screens/MarketplaceScreen";
import { MarketplaceConfigureScreen } from "../../screens/MarketplaceConfigureScreen";
import { MarketplaceSummaryScreen } from "../../screens/MarketplaceSummaryScreen";
import { MarketplacePostOptionsScreen } from "../../screens/MarketplacePostOptionsScreen";
import { MarketplacePostScreen } from "../../screens/MarketplacePostScreen";
import { MarketplacePostHistoryScreen } from "../../screens/MarketplacePostHistoryScreen";
import { MarketplacePostEditScreen } from "../../screens/MarketplacePostEditScreen";
import { PublicReportOptionsScreen } from "../../screens/PublicReportOptionsScreen";
import { PublicReportHistoryScreen } from "../../screens/PublicReportHistoryScreen";
import { PublicReportScreen } from "../../screens/PublicReportScreen";
import { PublicReportConfigureScreen } from "../../screens/PublicReportConfigureScreen";
import { PublicReportSummaryScreen } from "../../screens/PublicReportSummaryScreen";
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

export type AppStackParamList = {
  Landing: undefined;
  Auth: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  Vehicles: undefined;
  VehicleForm: undefined;
  Profile: undefined;
  Settings: undefined;
  VehicleDashboard: { vehicleId: string };
  VehicleDetail: { vehicleId: string };
  Documents: { vehicleId: string };
  Fuel: { vehicleId: string };
  Statistics: { vehicleId: string };
  Reminders: { vehicleId: string };
  Share: { vehicleId: string };
  Marketplace: { vehicleId: string };
  MarketplaceConfigure: { vehicleId: string };
  MarketplaceSummary: {
    vehicleId: string;
    language: "en" | "pl";
    price: number | null;
    currency: string;
    reportOptions: {
      include_service_entries: boolean;
      include_fueling_stats: boolean;
      include_service_stats: boolean;
      include_notes: boolean;
      include_wheels_tires?: boolean;
    };
    selectedReportId: string | null;
  };
  MarketplacePostOptions: {
    content: string;
    vehicleTitle: string;
    vehicleId: string;
    postTitle?: string | null;
  };
  MarketplacePost: { vehicleId: string };
  MarketplacePostHistory: { vehicleId: string };
  MarketplacePostEdit: { postId: string };
  PublicReport: { vehicleId: string };
  PublicReportConfigure: { vehicleId: string };
  PublicReportSummary: {
    vehicleId: string;
    reportOptions: {
      include_service_entries: boolean;
      include_notes: boolean;
      include_fueling_stats: boolean;
      include_service_stats: boolean;
      include_wheels_tires?: boolean;
    };
    selectedVehiclePhotoIds: string[];
    tempPhotos: Array<{
      fileUri: string;
      displayOrder: number;
      mimeType?: string | null;
      fileName?: string | null;
    }>;
  };
  PublicReportOptions: {
    url: string;
    vehicleTitle: string;
    vehicleId: string;
    reportTitle?: string | null;
  };
  PublicReportHistory: { vehicleId: string };
  ManageVehicle: { vehicleId: string };
  ManageVehicleEdit: { vehicleId: string };
  DataPortability: { vehicleId: string };
  Export: { vehicleId: string };
  Import: { vehicleId: string };
  AddAttachment: { vehicleId: string };
  ServiceEntryForm: { vehicleId: string; entryId?: string };
  ServiceEntryDetail: { vehicleId: string; entryId: string };
  FuelingEntryForm: { vehicleId: string; entryId?: string };
  ReminderForm: { vehicleId: string; reminderId?: string };
  ReminderDetail: { vehicleId: string; reminderId: string };
  Wheels: { vehicleId: string };
  TiresList: { vehicleId: string };
  WheelsList: { vehicleId: string };
  TireDetail: { vehicleId: string; tireId: string };
  WheelDetail: { vehicleId: string; wheelId: string };
  TireForm: { vehicleId: string; tireId?: string };
  WheelForm: { vehicleId: string; wheelId?: string };
  Workshops: undefined;
  WorkshopDetail: { workshopId: string };
  WorkshopForm: { workshopId?: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={session ? "authenticated" : "unauthenticated"}
      screenOptions={{ headerShown: false }}
      initialRouteName={session ? "Vehicles" : "Landing"}
    >
      {!session ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Vehicles" component={VehiclesScreen} />
          <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
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
          <Stack.Screen
            name="ReminderDetail"
            component={ReminderDetailScreen}
          />
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
          <Stack.Screen
            name="MarketplacePost"
            component={MarketplacePostScreen}
          />
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
          <Stack.Screen
            name="DataPortability"
            component={DataPortabilityScreen}
          />
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
          <Stack.Screen
            name="WorkshopDetail"
            component={WorkshopDetailScreen}
          />
          <Stack.Screen name="WorkshopForm" component={WorkshopFormScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
