/** Reorderable blocks on the dashboard overview (middle pager page). */
export const DASHBOARD_OVERVIEW_SECTION_IDS = [
  "quickMetrics",
  "specification",
  "quickActions",
  "upcomingReminders",
  "formalities",
  "wheels",
  "notes",
] as const;

export type DashboardOverviewSectionId =
  (typeof DASHBOARD_OVERVIEW_SECTION_IDS)[number];

/** Reorderable blocks on the dashboard statistics panel (right pager page). */
export const DASHBOARD_STATS_SECTION_IDS = [
  "expenseSummary",
  "mileageOverTimeChart",
  "fuelStats",
  "expensesByCategory",
  "recentService",
  "expensesOverTime",
  "oilChange",
] as const;

export type DashboardStatsSectionId =
  (typeof DASHBOARD_STATS_SECTION_IDS)[number];

export const DASHBOARD_STATS_PANEL_ID = "statistics" as const;
