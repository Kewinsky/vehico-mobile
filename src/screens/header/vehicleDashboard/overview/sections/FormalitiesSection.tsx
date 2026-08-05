import { Pressable, View } from "react-native";

import { hexToRgba } from "../../../../../ui/components/common/ChoiceChip";
import { formatTermsValue } from "../../domain/terms";
import { DashboardSection } from "../../components/DashboardSection";
import { DashboardStatTile } from "../../components/DashboardStatTile";
import type { OverviewPanelProps } from "../types";

function FormalityTile({
  label,
  validUntil,
  daysUntil,
  onPress,
  styles,
  theme,
  t,
  language,
  fullWidth = false,
}: {
  label: string;
  validUntil: string | null | undefined;
  daysUntil: number | null;
  onPress: () => void;
  styles: OverviewPanelProps["styles"];
  theme: OverviewPanelProps["theme"];
  t: OverviewPanelProps["t"];
  language: string;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        fullWidth
          ? styles.formalityTileTriggerFull
          : styles.formalityTileTrigger,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
    >
      <DashboardStatTile
        showChevron
        fullWidth={fullWidth}
        label={label}
        valueMain={formatTermsValue(validUntil, daysUntil, t, language)}
        valueMainColor={
          daysUntil != null && daysUntil < 0 ? theme.colors.danger : undefined
        }
        backgroundColor={
          daysUntil != null && daysUntil <= 30
            ? hexToRgba(theme.colors.danger, 0.15)
            : undefined
        }
        labelColor={
          daysUntil != null && daysUntil <= 30
            ? theme.colors.danger
            : undefined
        }
      />
    </Pressable>
  );
}

export function FormalitiesSection({
  styles,
  theme,
  t,
  language,
  vehicle,
  insuranceDaysUntil,
  acDaysUntil,
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
  | "acDaysUntil"
  | "inspectionDaysUntil"
  | "openFormalitiesDateEditor"
>) {
  return (
    <DashboardSection
      title={t("dashboard.stats.formalities", { defaultValue: "Formalności" })}
    >
      <View style={styles.formalitiesStack}>
        <View style={styles.tilesRow}>
          <FormalityTile
            label={t("dashboard.stats.insuranceOc")}
            validUntil={vehicle?.insurance_valid_until}
            daysUntil={insuranceDaysUntil}
            onPress={() =>
              openFormalitiesDateEditor(
                "insurance_valid_until",
                vehicle?.insurance_valid_until,
                t("dashboard.stats.insuranceOc"),
                t("dashboard.formalitiesUpdate.insurancePrompt"),
              )
            }
            styles={styles}
            theme={theme}
            t={t}
            language={language}
          />
          <FormalityTile
            label={t("dashboard.stats.insuranceAc")}
            validUntil={vehicle?.ac_valid_until}
            daysUntil={acDaysUntil}
            onPress={() =>
              openFormalitiesDateEditor(
                "ac_valid_until",
                vehicle?.ac_valid_until,
                t("dashboard.stats.insuranceAc"),
                t("dashboard.formalitiesUpdate.acPrompt"),
              )
            }
            styles={styles}
            theme={theme}
            t={t}
            language={language}
          />
        </View>
        <FormalityTile
          fullWidth
          label={t("dashboard.stats.inspection")}
          validUntil={vehicle?.inspection_valid_until}
          daysUntil={inspectionDaysUntil}
          onPress={() =>
            openFormalitiesDateEditor(
              "inspection_valid_until",
              vehicle?.inspection_valid_until,
              t("dashboard.stats.inspection"),
              t("dashboard.formalitiesUpdate.inspectionPrompt"),
            )
          }
          styles={styles}
          theme={theme}
          t={t}
          language={language}
        />
      </View>
    </DashboardSection>
  );
}
