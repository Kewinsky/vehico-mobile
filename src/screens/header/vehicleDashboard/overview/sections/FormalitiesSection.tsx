import { Pressable, View } from "react-native";

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
        <Pressable
          onPress={() =>
            openFormalitiesDateEditor(
              "insurance_valid_until",
              vehicle?.insurance_valid_until,
              t("dashboard.stats.insurance"),
              t("dashboard.formalitiesUpdate.insurancePrompt"),
            )
          }
          style={({ pressed }) => [
            styles.formalityTileTrigger,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <DashboardStatTile
            showChevron
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
                ? hexToRgba(theme.colors.danger, 0.15)
                : undefined
            }
            labelColor={
              insuranceDaysUntil != null && insuranceDaysUntil <= 30
                ? theme.colors.danger
                : undefined
            }
          />
        </Pressable>
        <Pressable
          onPress={() =>
            openFormalitiesDateEditor(
              "inspection_valid_until",
              vehicle?.inspection_valid_until,
              t("dashboard.stats.inspection"),
              t("dashboard.formalitiesUpdate.inspectionPrompt"),
            )
          }
          style={({ pressed }) => [
            styles.formalityTileTrigger,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <DashboardStatTile
            showChevron
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
                ? hexToRgba(theme.colors.danger, 0.15)
                : undefined
            }
            labelColor={
              inspectionDaysUntil != null && inspectionDaysUntil <= 30
                ? theme.colors.danger
                : undefined
            }
          />
        </Pressable>
      </View>
    </DashboardSection>
  );
}
