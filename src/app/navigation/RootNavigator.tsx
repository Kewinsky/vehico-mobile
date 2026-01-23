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
import { SettingsScreen } from "../../screens/SettingsScreen";
import { DataPortabilityScreen } from "../../screens/DataPortabilityScreen";
import { ExportScreen } from "../../screens/ExportScreen";
import { ImportScreen } from "../../screens/ImportScreen";
import { AddAttachmentScreen } from "../../screens/AddAttachmentScreen";
import { ShareScreen } from "../../screens/ShareScreen";
import { StatisticsScreen } from "../../screens/StatisticsScreen";
import { MarketplacePostScreen } from "../../screens/MarketplacePostScreen";
import { MarketplacePostHistoryScreen } from "../../screens/MarketplacePostHistoryScreen";
import { MarketplacePostEditScreen } from "../../screens/MarketplacePostEditScreen";
import { PublicReportOptionsScreen } from "../../screens/PublicReportOptionsScreen";
import { PublicReportHistoryScreen } from "../../screens/PublicReportHistoryScreen";
import { PublicReportScreen } from "../../screens/PublicReportScreen";

export type AppStackParamList = {
  Landing: undefined;
  Auth: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  Vehicles: undefined;
  VehicleForm: undefined;
  Settings: undefined;
  VehicleDashboard: { vehicleId: string };
  VehicleDetail: { vehicleId: string };
  Documents: { vehicleId: string };
  Fuel: { vehicleId: string };
  Statistics: { vehicleId: string };
  Reminders: { vehicleId: string };
  Share: { vehicleId: string };
  MarketplacePost: { vehicleId: string };
  MarketplacePostHistory: { vehicleId: string };
  MarketplacePostEdit: { postId: string };
  PublicReport: { vehicleId: string };
  PublicReportOptions: { url: string; vehicleTitle: string };
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
      key={session ? 'authenticated' : 'unauthenticated'}
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
          <Stack.Screen
            name="PublicReport"
            component={PublicReportScreen}
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
        </>
      )}
    </Stack.Navigator>
  );
}
