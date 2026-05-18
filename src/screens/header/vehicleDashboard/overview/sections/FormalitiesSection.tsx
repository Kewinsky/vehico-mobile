import { View } from "react-native";
import { CheckCheck, ShieldCheck } from "lucide-react-native";

import { hexToRgba } from "../../../../../ui/components/common/ChoiceChip";
import { formatTermsValue } from "../../domain/terms";
import { DashboardSection } from "../../components/DashboardSection";
import { DashboardStatTile } from "../../components/DashboardStatTile";
import type { OverviewPanelProps } from "../types";

export function FormalitiesSection({
  styles,
  theme,
  t,
  language,
  vehicle,
  insuranceDaysUntil,
  inspectionDaysUntil,
  openFormalitiesDateEditor,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "language"
  | "vehicle"
  | "insuranceDaysUntil"
  | "inspectionDaysUntil"
  | "openFormalitiesDateEditor"
>) {
  return (
    <DashboardSection
      title={t("dashboard.stats.formalities", { defaultValue: "Formalności" })}
    >
      <View style={styles.tilesRow}>
        <DashboardStatTile
          onPress={() =>
            openFormalitiesDateEditor(
              "insurance_valid_until",
              vehicle?.insurance_valid_until,
              t("dashboard.stats.insurance"),
              t("dashboard.formalitiesUpdate.insurancePrompt"),
            )
          }
          iconComponent={
            <ShieldCheck
              size={20}
              color={
                insuranceDaysUntil != null && insuranceDaysUntil <= 30
                  ? theme.colors.danger
                  : theme.colors.accent
              }
            />
          }
          label={t("dashboard.stats.insurance")}
          valueMain={formatTermsValue(
            vehicle?.insurance_valid_until,
            insuranceDaysUntil,
            t,
            language,
          )}
          valueMainColor={
            insuranceDaysUntil != null && insuranceDaysUntil < 0
              ? theme.colors.danger
              : undefined
          }
          backgroundColor={
            insuranceDaysUntil != null && insuranceDaysUntil <= 30
              ? hexToRgba(theme.colors.danger, 0.18)
              : undefined
          }
          labelColor={
            insuranceDaysUntil != null && insuranceDaysUntil <= 30
              ? theme.colors.danger
              : undefined
          }
          iconColor={
            insuranceDaysUntil != null && insuranceDaysUntil <= 30
              ? theme.colors.danger
              : undefined
          }
        />
        <DashboardStatTile
          onPress={() =>
            openFormalitiesDateEditor(
              "inspection_valid_until",
              vehicle?.inspection_valid_until,
              t("dashboard.stats.inspection"),
              t("dashboard.formalitiesUpdate.inspectionPrompt"),
            )
          }
          iconComponent={
            <CheckCheck
              size={20}
              color={
                inspectionDaysUntil != null && inspectionDaysUntil <= 30
                  ? theme.colors.danger
                  : theme.colors.accent
              }
            />
          }
          label={t("dashboard.stats.inspection")}
          valueMain={formatTermsValue(
            vehicle?.inspection_valid_until,
            inspectionDaysUntil,
            t,
            language,
          )}
          valueMainColor={
            inspectionDaysUntil != null && inspectionDaysUntil < 0
              ? theme.colors.danger
              : undefined
          }
          backgroundColor={
            inspectionDaysUntil != null && inspectionDaysUntil <= 30
              ? hexToRgba(theme.colors.danger, 0.18)
              : undefined
          }
          labelColor={
            inspectionDaysUntil != null && inspectionDaysUntil <= 30
              ? theme.colors.danger
              : undefined
          }
          iconColor={
            inspectionDaysUntil != null && inspectionDaysUntil <= 30
              ? theme.colors.danger
              : undefined
          }
        />
      </View>
    </DashboardSection>
  );
}
