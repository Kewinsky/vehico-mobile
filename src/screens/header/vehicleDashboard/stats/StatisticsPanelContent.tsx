import { useMemo } from "react";
import { View } from "react-native";

import { type DashboardStatsSectionId } from "../sections/sectionIds";
import { useDashboardSectionOrder } from "../useDashboardSectionOrder";
import { ExpenseSummarySection } from "./sections/ExpenseSummarySection";
import { ExpensesByCategorySection } from "./sections/ExpensesByCategorySection";
import { ExpensesOverTimeSection } from "./sections/ExpensesOverTimeSection";
import { FuelStatsSection } from "./sections/FuelStatsSection";
import { MileageOverTimeChartSection } from "./sections/MileageOverTimeChartSection";
import { OilChangeSection } from "./sections/OilChangeSection";
import { RecentServiceSection } from "./sections/RecentServiceSection";
import type { StatisticsPanelProps } from "./types";

const PREMIUM_STATS_SECTIONS = new Set<DashboardStatsSectionId>([
  "mileageOverTimeChart",
  "expensesByCategory",
  "oilChange",
]);

export function StatisticsPanelContent(props: StatisticsPanelProps) {
  const { orderedIds } = useDashboardSectionOrder("stats");
  const visibleSectionIds = useMemo(
    () =>
      props.isPremium
        ? orderedIds
        : orderedIds.filter((id) => !PREMIUM_STATS_SECTIONS.has(id)),
    [orderedIds, props.isPremium],
  );

  const sectionRenderers = {
    expenseSummary: () => <ExpenseSummarySection {...props} />,
    mileageOverTimeChart: () => <MileageOverTimeChartSection {...props} />,
    fuelStats: () => <FuelStatsSection {...props} />,
    recentService: () => <RecentServiceSection {...props} />,
    expensesByCategory: () => <ExpensesByCategorySection {...props} />,
    expensesOverTime: () => <ExpensesOverTimeSection {...props} />,
    oilChange: () => <OilChangeSection {...props} />,
  } as const;

  return (
    <View>
      {visibleSectionIds.map((sectionId) => (
        <View key={sectionId}>{sectionRenderers[sectionId]()}</View>
      ))}
    </View>
  );
}
