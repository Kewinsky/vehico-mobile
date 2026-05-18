import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fuel } from "lucide-react-native";

import { DashboardSection } from "../../components/DashboardSection";
import { OVERVIEW_DETAIL_ICON_SIZE } from "../constants";
import type { OverviewPanelProps } from "../types";

export function QuickActionsSection({
  styles,
  theme,
  t,
  handleAddService,
  handleAddFuel,
  handleAddReminder,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "handleAddService"
  | "handleAddFuel"
  | "handleAddReminder"
>) {
  const iconSize = OVERVIEW_DETAIL_ICON_SIZE;

  return (
    <DashboardSection
      title={t("dashboard.quickActionsTitle", { defaultValue: "Quick actions" })}
    >
      <View style={styles.quickActionsRow}>
        <Pressable
          onPress={handleAddService}
          hitSlop={8}
          style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}
        >
          <Ionicons
            name="construct"
            size={iconSize}
            color={theme.colors.accent}
            style={styles.quickActionIcon}
          />
          <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>
            {t("dashboard.quickActions.addService")}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleAddFuel}
          hitSlop={8}
          style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}
        >
          <Fuel
            size={iconSize}
            color={theme.colors.accent}
            style={styles.quickActionIcon}
          />
          <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>
            {t("dashboard.quickActions.addFuel")}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleAddReminder}
          hitSlop={8}
          style={[styles.quickActionCard, { backgroundColor: theme.colors.card }]}
        >
          <Ionicons
            name="notifications"
            size={iconSize}
            color={theme.colors.accent}
            style={styles.quickActionIcon}
          />
          <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>
            {t("dashboard.quickActions.addReminder")}
          </Text>
        </Pressable>
      </View>
    </DashboardSection>
  );
}
