import { Text, View } from "react-native";

import { DashboardSection } from "../../components/DashboardSection";
import type { OverviewPanelProps } from "../types";

export function NotesSection({
  styles,
  theme,
  t,
  vehicle,
}: Pick<OverviewPanelProps, "styles" | "theme" | "t" | "vehicle">) {
  const notes = vehicle?.notes?.trim();
  if (!notes) {
    return null;
  }

  return (
    <DashboardSection title={t("manageVehicle.notesLabel")}>
      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.notesText, { color: theme.colors.fg }]}>
          {notes}
        </Text>
      </View>
    </DashboardSection>
  );
}
