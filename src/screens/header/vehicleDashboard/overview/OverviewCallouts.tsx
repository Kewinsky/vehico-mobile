import type { ReactNode } from "react";
import { CheckCheck, Clock, ShieldCheck } from "lucide-react-native";
import type { TFunction } from "i18next";

import type { VehicleFormalityDateField } from "../../../../constants/vehicleTypes";
import { DashboardCalloutCard } from "../../../../ui/components/dashboard/DashboardCalloutCard";
import { SERVICE_CATEGORY_COLORS } from "../../../../ui/theme/serviceCategoryColors";
import type { Vehicle } from "../../../../types/domain";
import type { OilChangeDueState } from "../../../../utils/oilChangeDue";

type OverviewCalloutsProps = {
  t: TFunction;
  theme: { colors: { accent: string } };
  isPremium: boolean;
  vehicle: Vehicle | null;
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
  openFormalitiesDateEditor: (
    field: VehicleFormalityDateField,
    currentValue: string | null | undefined,
    label: string,
    prompt: string,
  ) => void;
};

export function OverviewCallouts({
  t,
  theme,
  isPremium,
  vehicle,
  mileageStaleTitle,
  handleQuickMileageEdit,
  insuranceCalloutCopy,
  acCalloutCopy,
  inspectionCalloutCopy,
  oilChangeDueState,
  oilBannerCopy,
  handleOilChangeDone,
  handleOilChangeBook,
  oilBookLoading,
  openFormalitiesDateEditor,
}: OverviewCalloutsProps) {
  return (
    <>
      {mileageStaleTitle ? (
        <DashboardCalloutCard
          accentColor={SERVICE_CATEGORY_COLORS.maintenance}
          buttonColor={SERVICE_CATEGORY_COLORS.maintenance}
          icon={
            <Clock
              size={26}
              color={SERVICE_CATEGORY_COLORS.maintenance}
              strokeWidth={2}
            />
          }
          title={mileageStaleTitle}
          actions={[
            {
              label: t("dashboard.mileageUpdated.cta"),
              onPress: handleQuickMileageEdit,
            },
          ]}
        />
      ) : null}
      {isPremium && insuranceCalloutCopy ? (
        <DashboardCalloutCard
          accentColor={theme.colors.accent}
          buttonColor={theme.colors.accent}
          icon={
            <ShieldCheck
              size={26}
              color={theme.colors.accent}
              strokeWidth={2}
            />
          }
          title={insuranceCalloutCopy.title}
          description={insuranceCalloutCopy.description}
          actions={[
            {
              label: t("dashboard.insuranceBanner.cta"),
              onPress: () =>
                openFormalitiesDateEditor(
                  "insurance_valid_until",
                  vehicle?.insurance_valid_until,
                  t("dashboard.stats.insuranceOc"),
                  t("dashboard.formalitiesUpdate.insurancePrompt"),
                ),
            },
          ]}
        />
      ) : null}
      {isPremium && acCalloutCopy ? (
        <DashboardCalloutCard
          accentColor={theme.colors.accent}
          buttonColor={theme.colors.accent}
          icon={
            <ShieldCheck
              size={26}
              color={theme.colors.accent}
              strokeWidth={2}
            />
          }
          title={acCalloutCopy.title}
          description={acCalloutCopy.description}
          actions={[
            {
              label: t("dashboard.acBanner.cta"),
              onPress: () =>
                openFormalitiesDateEditor(
                  "ac_valid_until",
                  vehicle?.ac_valid_until,
                  t("dashboard.stats.insuranceAc"),
                  t("dashboard.formalitiesUpdate.acPrompt"),
                ),
            },
          ]}
        />
      ) : null}
      {isPremium && inspectionCalloutCopy ? (
        <DashboardCalloutCard
          accentColor={theme.colors.accent}
          buttonColor={theme.colors.accent}
          icon={
            <CheckCheck
              size={26}
              color={theme.colors.accent}
              strokeWidth={2}
            />
          }
          title={inspectionCalloutCopy.title}
          description={inspectionCalloutCopy.description}
          actions={[
            {
              label: t("dashboard.inspectionBanner.cta"),
              onPress: () =>
                openFormalitiesDateEditor(
                  "inspection_valid_until",
                  vehicle?.inspection_valid_until,
                  t("dashboard.stats.inspection"),
                  t("dashboard.formalitiesUpdate.inspectionPrompt"),
                ),
            },
          ]}
        />
      ) : null}
      {isPremium && oilChangeDueState.showBanner ? (
        <DashboardCalloutCard
          accentColor={SERVICE_CATEGORY_COLORS.oil_change}
          buttonColor={SERVICE_CATEGORY_COLORS.oil_change}
          title={oilBannerCopy.title}
          description={oilBannerCopy.description}
          meta={oilBannerCopy.meta}
          actions={[
            {
              label: t("dashboard.oilBanner.done"),
              onPress: handleOilChangeDone,
            },
            {
              label: t("dashboard.oilBanner.book"),
              onPress: () => void handleOilChangeBook(),
              variant: "outlined",
              disabled:
                !oilChangeDueState.lastOilChange?.workshop_id || oilBookLoading,
              loading: oilBookLoading,
            },
          ]}
        />
      ) : null}
    </>
  );
}
