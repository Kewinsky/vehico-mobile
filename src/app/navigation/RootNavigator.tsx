import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const nativeHeaderScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTransparent: true,
} as const;

import { useAuth } from "../providers/AuthProvider";
import { LandingScreen } from "../../screens/landing/LandingScreen";
import { AuthScreen } from "../../screens/modal/AuthScreen";
import { VehiclesScreen } from "../../screens/welcome/VehiclesScreen";
import { VehicleFormScreen } from "../../screens/modal/VehicleFormScreen";
import { VehicleDashboardScreen } from "../../screens/header/VehicleDashboardScreen";
import { ServiceHistoryScreen } from "../../screens/header/ServiceHistoryScreen";
import { ServiceHistoryFiltersScreen } from "../../screens/modal/ServiceHistoryFiltersScreen";
import { ManageVehicleScreen } from "../../screens/header/ManageVehicleScreen";
import { DocumentsScreen } from "../../screens/header/DocumentsScreen";
import { FuelScreen } from "../../screens/header/FuelScreen";
import { FuelFiltersScreen } from "../../screens/modal/FuelFiltersScreen";
import { FuelingEntryFormScreen } from "../../screens/modal/FuelingEntryFormScreen";
import { RemindersScreen } from "../../screens/header/RemindersScreen";
import { ReminderFormScreen } from "../../screens/modal/ReminderFormScreen";
import { ServiceEntryFormScreen } from "../../screens/modal/ServiceEntryFormScreen";
import { SettingsScreen } from "../../screens/modal/SettingsScreen";
import { DataPortabilityScreen } from "../../screens/header/DataPortabilityScreen";
import { ImportScreen } from "../../screens/header/ImportScreen";
import { AddAttachmentScreen } from "../../screens/header/AddAttachmentScreen";
import { AddAttachmentFiltersScreen } from "../../screens/modal/AddAttachmentFiltersScreen";
import { ShareScreen } from "../../screens/header/ShareScreen";
import { StatisticsScreen } from "../../screens/header/StatisticsScreen";
import { MarketplaceScreen } from "../../screens/header/MarketplaceScreen";
import { MarketplaceConfigureScreen } from "../../screens/header/MarketplaceConfigureScreen";
import { MarketplaceSummaryScreen } from "../../screens/header/MarketplaceSummaryScreen";
import { MarketplacePostOptionsScreen } from "../../screens/header/MarketplacePostOptionsScreen";
import { MarketplacePostHistoryScreen } from "../../screens/header/MarketplacePostHistoryScreen";
import { PublicReportOptionsScreen } from "../../screens/header/PublicReportOptionsScreen";
import { PublicReportHistoryScreen } from "../../screens/header/PublicReportHistoryScreen";
import { PublicReportScreen } from "../../screens/header/PublicReportScreen";
import { PublicReportConfigureScreen } from "../../screens/header/PublicReportConfigureScreen";
import { PublicReportSummaryScreen } from "../../screens/header/PublicReportSummaryScreen";
import { WheelsOverviewScreen } from "../../screens/header/WheelsOverviewScreen";
import { TiresListScreen } from "../../screens/header/TiresListScreen";
import { TiresListFiltersScreen } from "../../screens/modal/TiresListFiltersScreen";
import { WheelsListScreen } from "../../screens/header/WheelsListScreen";
import { WheelsListFiltersScreen } from "../../screens/modal/WheelsListFiltersScreen";
import { TireFormScreen } from "../../screens/modal/TireFormScreen";
import { WheelFormScreen } from "../../screens/modal/WheelFormScreen";
import { WorkshopsScreen } from "../../screens/header/WorkshopsScreen";
import { WorkshopsFiltersScreen } from "../../screens/modal/WorkshopsFiltersScreen";
import { WorkshopFormScreen } from "../../screens/modal/WorkshopFormScreen";
import { ShopScreen } from "../../screens/modal/ShopScreen";
import { ExampleListingScreen } from "../../screens/modal/ExampleListingScreen";
import { AppearanceScreen } from "../../screens/modal/AppearanceScreen";
import { OnboardingScreen } from "../../screens/onboarding/OnboardingScreen";

export type AppStackParamList = {
  Landing: undefined;
  Auth: { magicLinkError?: "expired" } | undefined;
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
      distance_unit?: "km" | "miles";
      fuel_unit?: "liters" | "gallons";
      currency?: "PLN" | "USD";
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
          <Stack.Screen
            name="Landing"
            component={LandingScreen}
            options={{
              headerShown: true,
              title: "",
              headerShadowVisible: false,
              headerTransparent: true,
            }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              presentation: "fullScreenModal",
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
              presentation: "fullScreenModal",
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
        </>
      )}
    </Stack.Navigator>
  );
}
