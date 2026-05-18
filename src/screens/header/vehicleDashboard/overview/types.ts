import type { TFunction } from "i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../../../app/navigation/RootNavigator";
import type { Reminder, Vehicle } from "../../../../types/domain";
import type { OilChangeDueState } from "../../../../utils/oilChangeDue";
import type { OverviewPanelStyles } from "./overviewStyles";

export type OverviewQuickMetrics = {
  consumptionPrimary: string;
  consumptionSecondary: string;
  costNumber: string;
  costShowCurrency: boolean;
  distanceNumber: string;
  distanceShowUnit: boolean;
  remindersPrimary: string;
};

export type OverviewPanelProps = {
  windowWidth: number;
  styles: OverviewPanelStyles;
  vehicleId: string;
  vehicle: Vehicle | null;
  navigation: NativeStackNavigationProp<AppStackParamList, "VehicleDashboard">;
  t: TFunction;
  language: string;
  theme: {
    colors: {
      fg: string;
      muted: string;
      accent: string;
      card: string;
      danger: string;
    };
    spacing: { md: number };
  };
  isPremium: boolean;
  publicReportUrl: string | null;
  onCopyVin: () => void;
  openPublicReportShareActions: () => void;
  mileageStaleTitle: string | null;
  handleQuickMileageEdit: () => void;
  insuranceCalloutCopy: { title: string; description: string } | null;
  inspectionCalloutCopy: { title: string; description: string } | null;
  oilChangeDueState: OilChangeDueState;
  oilBannerCopy: { title: string; description?: string; meta?: string };
  handleOilChangeDone: () => void;
  handleOilChangeBook: () => void | Promise<void>;
  oilBookLoading: boolean;
  quickMetrics: OverviewQuickMetrics;
  currency: string;
  distanceUnitLabel: string;
  handleAddService: () => void;
  handleAddFuel: () => void;
  handleAddReminder: () => void;
  upcomingReminders: Reminder[];
  insuranceDaysUntil: number | null;
  inspectionDaysUntil: number | null;
  openFormalitiesDateEditor: (
    field: "insurance_valid_until" | "inspection_valid_until",
    currentValue: string | null | undefined,
    label: string,
    prompt: string,
  ) => void;
  fittedTiresLines: string[];
  fittedWheelsLines: string[];
};
