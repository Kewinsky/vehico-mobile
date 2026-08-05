import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../../../app/navigation/RootNavigator";
import type { VehicleFormalityDateField } from "../../../../constants/vehicleTypes";
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
  navigation: NativeStackNavigationProp<AppStackParamList>;
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
  onShowQrCode: () => void;
  mileageStaleTitle: string | null;
  handleQuickMileageEdit: () => void;
  insuranceCalloutCopy: {
    title: string;
    description?: ReactNode;
  } | null;
  acCalloutCopy: {
    title: string;
    description?: ReactNode;
  } | null;
  inspectionCalloutCopy: {
    title: string;
    description?: ReactNode;
  } | null;
  oilChangeDueState: OilChangeDueState;
  oilBannerCopy: {
    title: string;
    description?: ReactNode;
    meta?: ReactNode;
  };
  handleOilChangeDone: () => void;
  handleOilChangeBook: () => void | Promise<void>;
  oilBookLoading: boolean;
  pendingWorkshopCount: number;
  handlePendingWorkshopPress: () => void;
  quickMetrics: OverviewQuickMetrics;
  currency: string;
  distanceUnitLabel: string;
  handleAddService: () => void;
  handleAddFuel: () => void;
  handleAddReminder: () => void;
  upcomingReminders: Reminder[];
  insuranceDaysUntil: number | null;
  acDaysUntil: number | null;
  inspectionDaysUntil: number | null;
  openFormalitiesDateEditor: (
    field: VehicleFormalityDateField,
    currentValue: string | null | undefined,
    label: string,
    prompt: string,
  ) => void;
  fittedTiresLines: string[];
  fittedWheelsLines: string[];
};
