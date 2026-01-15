import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../providers/AuthProvider";
import { AuthScreen } from "../../screens/AuthScreen";
import { VehiclesScreen } from "../../screens/VehiclesScreen";
import { VehicleDashboardScreen } from "../../screens/VehicleDashboardScreen";
import { VehicleDetailScreen } from "../../screens/VehicleDetailScreen";
import { VehicleFormScreen } from "../../screens/VehicleFormScreen";
import { ManageVehicleScreen } from "../../screens/ManageVehicleScreen";
import { ManageVehicleEditScreen } from "../../screens/ManageVehicleEditScreen";
import { DocumentsScreen } from "../../screens/DocumentsScreen";
import { FuelCostsScreen } from "../../screens/FuelCostsScreen";
import { FuelingEntryFormScreen } from "../../screens/FuelingEntryFormScreen";
import { RemindersScreen } from "../../screens/RemindersScreen";
import { ReminderFormScreen } from "../../screens/ReminderFormScreen";
import { ReminderDetailScreen } from "../../screens/ReminderDetailScreen";
import { ServiceEntryDetailScreen } from "../../screens/ServiceEntryDetailScreen";
import { ServiceEntryFormScreen } from "../../screens/ServiceEntryFormScreen";
import { SettingsScreen } from "../../screens/SettingsScreen";
import { DataPortabilityScreen } from "../../screens/DataPortabilityScreen";
import { AddAttachmentScreen } from "../../screens/AddAttachmentScreen";
import { ShareScreen } from "../../screens/ShareScreen";
import { StatisticsScreen } from "../../screens/StatisticsScreen";

export type AppStackParamList = {
  Auth: undefined;
  Vehicles: undefined;
  VehicleForm: undefined;
  Settings: undefined;
  VehicleDashboard: { vehicleId: string; title: string };
  VehicleDetail: { vehicleId: string; title: string };
  Documents: { vehicleId: string; title: string };
  FuelCosts: { vehicleId: string; title: string };
  Statistics: { vehicleId: string; title: string };
  Reminders: { vehicleId: string; title: string };
  Share: { vehicleId: string; title: string };
  ManageVehicle: { vehicleId: string; title: string };
  ManageVehicleEdit: { vehicleId: string };
  DataPortability: { vehicleId: string; title: string };
  AddAttachment: { vehicleId: string; title: string };
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
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
          <Stack.Screen name="FuelCosts" component={FuelCostsScreen} />
          <Stack.Screen name="Statistics" component={StatisticsScreen} />
          <Stack.Screen
            name="FuelingEntryForm"
            component={FuelingEntryFormScreen}
          />
          <Stack.Screen name="Reminders" component={RemindersScreen} />
          <Stack.Screen name="ReminderForm" component={ReminderFormScreen} />
          <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
          <Stack.Screen name="Share" component={ShareScreen} />
          <Stack.Screen name="ManageVehicle" component={ManageVehicleScreen} />
          <Stack.Screen
            name="ManageVehicleEdit"
            component={ManageVehicleEditScreen}
          />
          <Stack.Screen
            name="DataPortability"
            component={DataPortabilityScreen}
          />
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
