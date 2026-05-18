import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CheckCheck, Clock, ShieldCheck } from "lucide-react-native";
import type { TFunction } from "i18next";

import { DashboardCalloutCard } from "../../../../ui/components/dashboard/DashboardCalloutCard";
import { SERVICE_CATEGORY_COLORS } from "../../../../ui/theme/serviceCategoryColors";
import type { Vehicle } from "../../../../types/domain";
import type { OilChangeDueState } from "../../../../utils/oilChangeDue";

type OverviewCalloutsProps = {
  t: TFunction;
  theme: { colors: { accent: string } };
  vehicle: Vehicle | null;
  mileageStaleTitle: string | null;
  handleQuickMileageEdit: () => void;
  insuranceCalloutCopy: { title: string; description: string } | null;
  inspectionCalloutCopy: { title: string; description: string } | null;
  oilChangeDueState: OilChangeDueState;
  oilBannerCopy: { title: string; description?: string; meta?: string };
  handleOilChangeDone: () => void;
  handleOilChangeBook: () => void | Promise<void>;
  oilBookLoading: boolean;
  openFormalitiesDateEditor: (
    field: "insurance_valid_until" | "inspection_valid_until",
    currentValue: string | null | undefined,
    label: string,
    prompt: string,
  ) => void;
};

export function OverviewCallouts({
  t,
  theme,
  vehicle,
  mileageStaleTitle,
  handleQuickMileageEdit,
  insuranceCalloutCopy,
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
      {insuranceCalloutCopy ? (
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
                  t("dashboard.stats.insurance"),
                  t("dashboard.formalitiesUpdate.insurancePrompt"),
                ),
            },
          ]}
        />
      ) : null}
      {inspectionCalloutCopy ? (
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
      {oilChangeDueState.showBanner ? (
        <DashboardCalloutCard
          accentColor={SERVICE_CATEGORY_COLORS.oil_change}
          buttonColor={SERVICE_CATEGORY_COLORS.oil_change}
          icon={
            <MaterialCommunityIcons
              name="oil"
              size={26}
              color={SERVICE_CATEGORY_COLORS.oil_change}
            />
          }
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
