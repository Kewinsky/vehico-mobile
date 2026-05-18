import { View } from "react-native";

import { DASHBOARD_STATS_SECTION_IDS } from "../sections/sectionIds";
import { ConsumptionVsFuelPriceChartSection } from "./sections/ConsumptionVsFuelPriceChartSection";
import { CostPerKmChartSection } from "./sections/CostPerKmChartSection";
import { ExpenseSummarySection } from "./sections/ExpenseSummarySection";
import { ExpensesByCategorySection } from "./sections/ExpensesByCategorySection";
import { ExpensesOverTimeSection } from "./sections/ExpensesOverTimeSection";
import { FuelStatsSection } from "./sections/FuelStatsSection";
import { OilChangeSection } from "./sections/OilChangeSection";
import { RecentServiceSection } from "./sections/RecentServiceSection";
import type { StatisticsPanelProps } from "./types";

export function StatisticsPanelContent(props: StatisticsPanelProps) {
  const sectionRenderers = {
    expenseSummary: () => <ExpenseSummarySection {...props} />,
    costPerKmChart: () => <CostPerKmChartSection {...props} />,
    fuelStats: () => <FuelStatsSection {...props} />,
    consumptionVsFuelPriceChart: () => (
      <ConsumptionVsFuelPriceChartSection {...props} />
    ),
    recentService: () => <RecentServiceSection {...props} />,
    expensesByCategory: () => <ExpensesByCategorySection {...props} />,
    expensesOverTime: () => <ExpensesOverTimeSection {...props} />,
    oilChange: () => <OilChangeSection {...props} />,
  } as const;

  return (
    <View>
      {DASHBOARD_STATS_SECTION_IDS.map((sectionId) => (
        <View key={sectionId}>{sectionRenderers[sectionId]()}</View>
      ))}
    </View>
  );
}
