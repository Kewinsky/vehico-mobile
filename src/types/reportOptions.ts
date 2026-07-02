import type { Currency } from "./domain";

/** Minimum fueling / service entries required for aggregate statistics. */
export const MIN_STATS_ENTRIES = 10;

/** Minimum mileage data points (service mileages + audit readings) for the chart. */
export const MIN_MILEAGE_CHART_POINTS = 3;

export type ReportOptions = {
  include_technical_data: boolean;
  include_insurance: boolean;
  include_inspection: boolean;
  include_notes: boolean;
  include_wheels: boolean;
  include_tires: boolean;
  include_service_history: boolean;
  include_service_stats: boolean;
  include_fueling_stats: boolean;
  include_expenses_by_category_chart: boolean;
  include_expenses_over_time_chart: boolean;
  include_mileage_over_time_chart: boolean;
  include_photos: boolean;
  distance_unit?: "km" | "miles";
  fuel_unit?: "liters" | "gallons";
  currency?: Currency;
};

export type MarketplaceReportOptions = Pick<
  ReportOptions,
  | "include_technical_data"
  | "include_insurance"
  | "include_inspection"
  | "include_notes"
  | "include_wheels"
  | "include_tires"
  | "include_service_history"
  | "include_service_stats"
  | "include_fueling_stats"
>;

export function hasEnoughStatsEntries(count: number): boolean {
  return count >= MIN_STATS_ENTRIES;
}

export function countMileageChartPoints(
  serviceEntriesCount: number,
  mileageAuditCount: number,
): number {
  return serviceEntriesCount + mileageAuditCount;
}

export function hasEnoughMileageChartPoints(
  serviceEntriesWithMileage: number,
  mileageAuditCount: number,
): boolean {
  return (
    countMileageChartPoints(
      serviceEntriesWithMileage,
      mileageAuditCount,
    ) >= MIN_MILEAGE_CHART_POINTS
  );
}
