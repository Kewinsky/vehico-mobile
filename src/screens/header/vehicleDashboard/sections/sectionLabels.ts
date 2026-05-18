import type { TFunction } from "i18next";

import type {
  DashboardOverviewSectionId,
  DashboardStatsSectionId,
} from "./sectionIds";

export type DashboardSectionPanel = "overview" | "stats";

const OVERVIEW_LABEL_KEYS: Record<DashboardOverviewSectionId, string> = {
  quickMetrics: "dashboard.sectionOrder.quickMetrics",
  specification: "dashboard.specification",
  quickActions: "dashboard.quickActionsTitle",
  upcomingReminders: "reminders.tabUpcoming",
  formalities: "dashboard.stats.formalities",
  wheels: "dashboard.stats.wheels",
  notes: "manageVehicle.notesLabel",
};

const STATS_LABEL_KEYS: Record<DashboardStatsSectionId, string> = {
  expenseSummary: "dashboard.sectionOrder.expenseSummary",
  costPerKmChart: "dashboard.stats.charts.costPerKmOverTime",
  fuelStats: "dashboard.stats.fuelStats",
  consumptionVsFuelPriceChart:
    "dashboard.stats.charts.consumptionVsFuelPrice",
  recentService: "dashboard.stats.recentService",
  expensesByCategory: "dashboard.stats.charts.expensesByCategory",
  expensesOverTime: "dashboard.stats.charts.expensesOverTime",
  oilChange: "dashboard.stats.oilChange",
};

export function dashboardSectionLabel(
  panel: DashboardSectionPanel,
  sectionId: string,
  t: TFunction,
): string {
  const key =
    panel === "overview"
      ? OVERVIEW_LABEL_KEYS[sectionId as DashboardOverviewSectionId]
      : STATS_LABEL_KEYS[sectionId as DashboardStatsSectionId];
  return key ? t(key) : sectionId;
}
