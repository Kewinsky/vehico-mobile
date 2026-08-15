import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fuel } from "lucide-react-native";

import { hexToRgba } from "../../../../../ui/components/common/ChoiceChip";
import { DashboardSection } from "../../components/DashboardSection";
import { OVERVIEW_DETAIL_ICON_SIZE } from "../constants";
import type { OverviewPanelProps } from "../types";

const QUICK_ACTION_BG_ALPHA = 0.18;

const QUICK_ACTIONS = [
  {
    key: "service",
    color: "#2563EB",
    icon: "construct" as const,
    labelKey: "dashboard.quickActions.addService",
    handler: "handleAddService" as const,
  },
  {
    key: "fuel",
    color: "#D97706",
    icon: "fuel" as const,
    labelKey: "dashboard.quickActions.addFuel",
    handler: "handleAddFuel" as const,
  },
  {
    key: "reminder",
    color: "#7C3AED",
    icon: "notifications" as const,
    labelKey: "dashboard.quickActions.addReminder",
    handler: "handleAddReminder" as const,
  },
] as const;

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
  const handlers = {
    handleAddService,
    handleAddFuel,
    handleAddReminder,
  };

  return (
    <DashboardSection
      title={t("dashboard.quickActionsTitle", { defaultValue: "Quick actions" })}
    >
      <View style={styles.quickActionsRow}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            onPress={handlers[action.handler]}
            hitSlop={8}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: hexToRgba(action.color, QUICK_ACTION_BG_ALPHA),
              },
            ]}
          >
            {action.icon === "fuel" ? (
              <Fuel
                size={iconSize}
                color={action.color}
                style={styles.quickActionIcon}
              />
            ) : (
              <Ionicons
                name={action.icon}
                size={iconSize}
                color={action.color}
                style={styles.quickActionIcon}
              />
            )}
            <Text style={[styles.quickActionLabel, { color: theme.colors.fg }]}>
              {t(action.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </DashboardSection>
  );
}
