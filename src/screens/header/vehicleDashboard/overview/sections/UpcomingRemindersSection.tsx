import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { routes } from "../../../../../core/navigation/routes";
import { ReminderItem } from "../../../../../ui/components/list/ReminderItem";
import { DashboardSection } from "../../components/DashboardSection";
import type { OverviewPanelProps } from "../types";

export function UpcomingRemindersSection({
  styles,
  theme,
  t,
  vehicleId,
  vehicle,
  upcomingReminders,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "vehicleId"
  | "vehicle"
  | "upcomingReminders"
>) {
  const router = useRouter();

  return (
    <DashboardSection
      title={t("reminders.tabUpcoming", { defaultValue: "Upcoming" })}
      headerRight={
        <Pressable
          onPress={() => router.push(routes.reminders(vehicleId))}
          hitSlop={8}
        >
          <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
            {t("dashboard.stats.viewAll")}
          </Text>
        </Pressable>
      }
    >
      {upcomingReminders.length > 0 ? (
        <View style={styles.upcomingRemindersList}>
          {upcomingReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              title={reminder.title ?? ""}
              createdAt={reminder.created_at}
              dueDate={reminder.due_date}
              dueMileage={reminder.due_mileage}
              currentMileage={vehicle?.mileage ?? null}
              anchorMileage={reminder.recurrence_anchor_mileage}
              remainingDistanceLabel={t("reminders.remainingDistance")}
              estimatedTimeLabel={t("reminders.estimatedTime")}
              onPress={() =>
                router.push(routes.reminderForm(vehicleId, reminder.id))
              }
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.pageSubTitle, { color: theme.colors.muted }]}>
          {t("reminders.noItems")}
        </Text>
      )}
    </DashboardSection>
  );
}
