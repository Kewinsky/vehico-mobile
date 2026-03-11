import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

/** Opcje dla ekranów używających HeaderLayout (natywny navbar). */
const nativeHeaderScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
} as const;

import { useAuth } from "../providers/AuthProvider";
import { LandingScreen } from "../../screens/no-header/LandingScreen";
import { AuthScreen } from "../../screens/modal/AuthScreen";
import { VehiclesScreen } from "../../screens/no-header/VehiclesScreen";
import { VehicleFormScreen } from "../../screens/modal/VehicleFormScreen";
import { VehicleDashboardScreen } from "../../screens/with-header/VehicleDashboardScreen";
import { ServiceHistoryScreen } from "../../screens/with-header/ServiceHistoryScreen";
import { ServiceHistoryFiltersScreen } from "../../screens/modal/ServiceHistoryFiltersScreen";
import { ManageVehicleScreen } from "../../screens/with-header/ManageVehicleScreen";
import { DocumentsScreen } from "../../screens/with-header/DocumentsScreen";
import { FuelScreen } from "../../screens/with-header/FuelScreen";
import { FuelFiltersScreen } from "../../screens/modal/FuelFiltersScreen";
import { FuelingEntryFormScreen } from "../../screens/modal/FuelingEntryFormScreen";
import { RemindersScreen } from "../../screens/with-header/RemindersScreen";
import { RemindersFiltersScreen } from "../../screens/modal/RemindersFiltersScreen";
import { ReminderFormScreen } from "../../screens/modal/ReminderFormScreen";
import { ServiceEntryFormScreen } from "../../screens/modal/ServiceEntryFormScreen";
import { SettingsScreen } from "../../screens/modal/SettingsScreen";
import { DataPortabilityScreen } from "../../screens/with-header/DataPortabilityScreen";
import { ImportScreen } from "../../screens/with-header/ImportScreen";
import { AddAttachmentScreen } from "../../screens/with-header/AddAttachmentScreen";
import { AddAttachmentFiltersScreen } from "../../screens/modal/AddAttachmentFiltersScreen";
import { ShareScreen } from "../../screens/with-header/ShareScreen";
import { StatisticsScreen } from "../../screens/with-header/StatisticsScreen";
import { MarketplaceScreen } from "../../screens/with-header/MarketplaceScreen";
import { MarketplaceConfigureScreen } from "../../screens/with-header/MarketplaceConfigureScreen";
import { MarketplaceSummaryScreen } from "../../screens/with-header/MarketplaceSummaryScreen";
import { MarketplacePostOptionsScreen } from "../../screens/with-header/MarketplacePostOptionsScreen";
import { MarketplacePostHistoryScreen } from "../../screens/with-header/MarketplacePostHistoryScreen";
import { PublicReportOptionsScreen } from "../../screens/with-header/PublicReportOptionsScreen";
import { PublicReportHistoryScreen } from "../../screens/with-header/PublicReportHistoryScreen";
import { PublicReportScreen } from "../../screens/with-header/PublicReportScreen";
import { PublicReportConfigureScreen } from "../../screens/with-header/PublicReportConfigureScreen";
import { PublicReportSummaryScreen } from "../../screens/with-header/PublicReportSummaryScreen";
import { WheelsOverviewScreen } from "../../screens/with-header/WheelsOverviewScreen";
import { TiresListScreen } from "../../screens/with-header/TiresListScreen";
import { TiresListFiltersScreen } from "../../screens/modal/TiresListFiltersScreen";
import { WheelsListScreen } from "../../screens/with-header/WheelsListScreen";
import { WheelsListFiltersScreen } from "../../screens/modal/WheelsListFiltersScreen";
import { TireFormScreen } from "../../screens/modal/TireFormScreen";
import { WheelFormScreen } from "../../screens/modal/WheelFormScreen";
import { WorkshopsScreen } from "../../screens/with-header/WorkshopsScreen";
import { WorkshopsFiltersScreen } from "../../screens/modal/WorkshopsFiltersScreen";
import { WorkshopFormScreen } from "../../screens/modal/WorkshopFormScreen";
import { ShopScreen } from "../../screens/modal/ShopScreen";
import { ExampleListingScreen } from "../../screens/modal/ExampleListingScreen";
import { PlaygroundScreen } from "../../screens/no-header/PlaygroundScreen";
import { AppearanceScreen } from "../../screens/modal/AppearanceScreen";
import { OnboardingScreen } from "../../screens/onboarding/OnboardingScreen";

export type AppStackParamList = {
  Landing: undefined;
  Auth: undefined;
  EmailConfirmation: { email?: string };
  Onboarding: undefined;
  Vehicles: { showVehiclePicker?: boolean } | undefined;
  VehicleForm: { vehicleId?: string };
  Settings: undefined;
  Appearance: undefined;
  VehicleDashboard: { vehicleId: string };
  ServiceHistory: { vehicleId: string };
  ServiceHistoryFilters: {
    vehicleId: string;
    categoryFilter?: string;
    dateFrom?: string;
    dateTo?: string;
    minCost?: string;
    maxCost?: string;
    showReminders?: boolean;
    sortOption?: string;
  };
  Documents: { vehicleId: string };
  Fuel: { vehicleId: string };
  FuelFilters: {
    vehicleId: string;
    dateFrom?: string;
    dateTo?: string;
    stationFilter?: string | null;
    minCost?: string;
    maxCost?: string;
  };
  Statistics: { vehicleId: string };
  Reminders: { vehicleId: string };
  RemindersFilters: {
    vehicleId: string;
    dateFrom?: string;
    dateTo?: string;
    statusFilter?: "all" | "active" | "done";
  };
  Share: { vehicleId: string };
  Marketplace: { vehicleId: string };
  MarketplaceConfigure: { vehicleId: string };
  MarketplaceSummary: {
    vehicleId: string;
    reportOptions: {
      include_technical_data: boolean;
      include_insurance: boolean;
      include_inspection: boolean;
      include_notes: boolean;
      include_wheels: boolean;
      include_tires: boolean;
      include_service_history: boolean;
      include_service_stats: boolean;
      include_fueling_stats: boolean;
    };
    includePrice: boolean;
    price: number | null;
    currency: string;
    includePublicReport: boolean;
    selectedReportId: string | null;
  };
  MarketplacePostOptions: {
    content: { pl: string; en: string };
    vehicleTitle: string;
    vehicleId: string;
    postTitle?: string | null;
    generatedAt?: string;
  };
  MarketplacePost: { vehicleId: string };
  MarketplacePostHistory: { vehicleId: string };
  MarketplacePostEdit: { postId: string };
  PublicReport: { vehicleId: string };
  PublicReportConfigure: { vehicleId: string };
  PublicReportSummary: {
    vehicleId: string;
    reportOptions: {
      include_technical_data: boolean;
      include_insurance: boolean;
      include_inspection: boolean;
      include_notes: boolean;
      include_wheels: boolean;
      include_tires: boolean;
      include_service_history: boolean;
      include_service_stats: boolean;
      include_fueling_stats: boolean;
      include_photos: boolean;
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
    generatedAt?: string;
  };
  PublicReportHistory: { vehicleId: string };
  ManageVehicle: { vehicleId: string };
  DataPortability: { vehicleId: string };
  Import: { vehicleId: string };
  AddAttachment: { vehicleId: string };
  AddAttachmentFilters: {
    vehicleId: string;
    sortOption?: "date-newest" | "date-oldest" | "title-az" | "title-za";
  };
  ServiceEntryForm: { vehicleId: string; entryId?: string };
  FuelingEntryForm: { vehicleId: string; entryId?: string };
  ReminderForm: { vehicleId: string; reminderId?: string };
  Wheels: { vehicleId: string };
  TiresList: { vehicleId: string };
  TiresListFilters: {
    vehicleId: string;
    tireTypeFilter?: string;
    fittedFilter?: "all" | "fitted" | "not_fitted";
    sortOrder?: "az" | "za";
  };
  WheelsList: { vehicleId: string };
  WheelsListFilters: {
    vehicleId: string;
    fittedFilter?: "all" | "fitted" | "not_fitted";
    sortOrder?: "az" | "za";
  };
  TireForm: { vehicleId: string; tireId?: string };
  WheelForm: { vehicleId: string; wheelId?: string };
  Workshops: undefined;
  WorkshopsFilters: {
    typeFilter?: string;
    sortOrder?: "az" | "za";
  };
  WorkshopForm: { workshopId?: string };
  Shop: undefined;
  ExampleListing: undefined;
  Playground: undefined;
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
      initialRouteName={
        session
          ? session.user.user_metadata?.has_completed_onboarding === true
            ? "Vehicles"
            : "Onboarding"
          : "Landing"
      }
    >
      {!session ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen
            name="Vehicles"
            component={VehiclesScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="VehicleForm"
            component={VehicleFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Appearance"
            component={AppearanceScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="VehicleDashboard"
            component={VehicleDashboardScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="ServiceHistory"
            component={ServiceHistoryScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="ServiceHistoryFilters"
            component={ServiceHistoryFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Documents"
            component={DocumentsScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="Fuel"
            component={FuelScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="FuelFilters"
            component={FuelFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="FuelingEntryForm"
            component={FuelingEntryFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Reminders"
            component={RemindersScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="RemindersFilters"
            component={RemindersFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="ReminderForm"
            component={ReminderFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Share"
            component={ShareScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="Marketplace"
            component={MarketplaceScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="MarketplaceConfigure"
            component={MarketplaceConfigureScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="MarketplaceSummary"
            component={MarketplaceSummaryScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="MarketplacePostOptions"
            component={MarketplacePostOptionsScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="MarketplacePostHistory"
            component={MarketplacePostHistoryScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="PublicReport"
            component={PublicReportScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="PublicReportConfigure"
            component={PublicReportConfigureScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="PublicReportSummary"
            component={PublicReportSummaryScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="PublicReportOptions"
            component={PublicReportOptionsScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="PublicReportHistory"
            component={PublicReportHistoryScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="ManageVehicle"
            component={ManageVehicleScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="DataPortability"
            component={DataPortabilityScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="Import"
            component={ImportScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="AddAttachment"
            component={AddAttachmentScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="AddAttachmentFilters"
            component={AddAttachmentFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="ServiceEntryForm"
            component={ServiceEntryFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Wheels"
            component={WheelsOverviewScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="TiresList"
            component={TiresListScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="TiresListFilters"
            component={TiresListFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="WheelsList"
            component={WheelsListScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="WheelsListFilters"
            component={WheelsListFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="TireForm"
            component={TireFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="WheelForm"
            component={WheelFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Workshops"
            component={WorkshopsScreen}
            options={nativeHeaderScreenOptions}
          />
          <Stack.Screen
            name="WorkshopsFilters"
            component={WorkshopsFiltersScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="WorkshopForm"
            component={WorkshopFormScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Shop"
            component={ShopScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="ExampleListing"
            component={ExampleListingScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="Playground" component={PlaygroundScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
