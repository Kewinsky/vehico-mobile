import { Pressable, Text, View } from "react-native";

import { SERVICE_CATEGORY_ICON_BACKGROUND } from "../../../../../ui/theme/serviceCategoryColors";
import { ServiceCategoryIcon } from "../../../../../ui/components/service/ServiceCategoryIcon";
import { ServiceItem } from "../../../../../ui/components/list/ServiceItem";
import { DashboardSectionHeader } from "../../components/DashboardSectionHeader";
import type { ServiceEntryCategory } from "../../../../../types/domain";
import type { StatisticsPanelProps } from "../types";

export function RecentServiceSection({
  styles,
  theme,
  t,
  currency,
  recentServiceEntries,
  workshopsById,
  navigateToServiceHistory,
  onServiceEntryPress,
}: StatisticsPanelProps) {
  return (
      <View style={styles.section}>
        <DashboardSectionHeader
          title={t("dashboard.stats.recentService")}
          right={
            <Pressable onPress={navigateToServiceHistory} hitSlop={8}>
              <Text
                style={[styles.viewAllLink, { color: theme.colors.accent }]}
              >
                {t("dashboard.stats.viewAll")}
              </Text>
            </Pressable>
          }
        />
        {recentServiceEntries.length > 0 ? (
          <View style={styles.recentServiceList}>
            {recentServiceEntries.map((entry) => {
              const cat = (entry.category ?? "other") as ServiceEntryCategory;
              return (
                <ServiceItem
                  key={entry.id}
                  title={entry.title}
                  icon={<ServiceCategoryIcon category={cat} />}
                  iconBackgroundColor={SERVICE_CATEGORY_ICON_BACKGROUND[cat]}
                  date={entry.service_date}
                  mileage={entry.mileage}
                  workshopName={
                    entry.workshop_id
                      ? workshopsById[entry.workshop_id]?.name
                      : null
                  }
                  cost={entry.cost}
                  currency={currency}
                  onPress={() => onServiceEntryPress(entry.id)}
                />
              );
            })}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.colors.muted }]}>
            {t("dashboard.stats.empty")}
          </Text>
        )}
      </View>
  );
}
