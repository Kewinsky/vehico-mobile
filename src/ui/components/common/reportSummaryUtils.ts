import type { ReportSummaryStatus } from "./ReportSummaryOptionRow";

export function reportSummaryStatus(
  included: boolean,
  hasData = true,
): ReportSummaryStatus {
  if (!included) return "notIncluded";
  return hasData ? "included" : "noData";
}
