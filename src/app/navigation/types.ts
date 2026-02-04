import type { NavigatorScreenParams } from "@react-navigation/native";

/**
 * Params for screens that live inside the Dashboard tab stack
 * (visible only after entering VehicleDashboard from Vehicles).
 */
export type DashboardStackParamList = {
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

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

export type MainTabsParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Placeholder: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

/** Root stack – no bottom tabs on these screens */
export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  EmailConfirmation: { email?: string };
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  Vehicles: undefined;
  VehicleForm: undefined;
  Profile: undefined;
  Settings: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
};
