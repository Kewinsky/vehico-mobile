import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { SegmentTabs } from "../../../../ui/components/common/SegmentTabs";
import type { PeriodKey } from "./types";

type StatisticsPeriodTabsProps = {
  value: PeriodKey;
  onChange: (next: PeriodKey) => void;
  preferFallback?: boolean;
};

export function StatisticsPeriodTabs({
  value,
  onChange,
  preferFallback = false,
}: StatisticsPeriodTabsProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      (
        [
          ["1m", "dashboard.stats.periods.1m"],
          ["3m", "dashboard.stats.periods.3m"],
          ["6m", "dashboard.stats.periods.6m"],
          ["1y", "dashboard.stats.periods.1y"],
          ["all", "dashboard.stats.periods.all"],
        ] as const
      ).map(([key, labelKey]) => ({
        value: key,
        label: t(labelKey),
      })),
    [t],
  );

  return (
    <SegmentTabs<PeriodKey>
      value={value}
      options={options}
      onChange={onChange}
      size="sm"
      variant="secondary"
      preferFallback={preferFallback}
    />
  );
}
