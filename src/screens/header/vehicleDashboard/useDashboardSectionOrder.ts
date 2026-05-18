import { useCallback, useMemo } from "react";

import { useEntitlements } from "../../../app/providers/EntitlementsProvider";
import { useUserSettings } from "../../../app/providers/UserSettingsProvider";
import { normalizeSectionOrder } from "../../../utils/dashboardSectionOrder";
import {
  DASHBOARD_OVERVIEW_SECTION_IDS,
  DASHBOARD_STATS_SECTION_IDS,
  type DashboardOverviewSectionId,
  type DashboardStatsSectionId,
} from "./sections/sectionIds";
import type { DashboardSectionPanel } from "./sections/sectionLabels";

type OverviewOrderResult = {
  orderedIds: DashboardOverviewSectionId[];
  saveOrder: (next: readonly DashboardOverviewSectionId[]) => Promise<void>;
  resetOrder: () => Promise<void>;
  defaultIds: readonly DashboardOverviewSectionId[];
};

type StatsOrderResult = {
  orderedIds: DashboardStatsSectionId[];
  saveOrder: (next: readonly DashboardStatsSectionId[]) => Promise<void>;
  resetOrder: () => Promise<void>;
  defaultIds: readonly DashboardStatsSectionId[];
};

export function useDashboardSectionOrder(
  panel: "overview",
): OverviewOrderResult;
export function useDashboardSectionOrder(panel: "stats"): StatsOrderResult;
export function useDashboardSectionOrder(
  panel: DashboardSectionPanel,
): OverviewOrderResult | StatsOrderResult {
  const { settings, setSettings } = useUserSettings();
  const { isPremium } = useEntitlements();

  const overviewStored = isPremium
    ? settings?.dashboardOverviewSectionOrder
    : undefined;
  const statsStored = isPremium ? settings?.dashboardStatsSectionOrder : undefined;

  const overviewOrdered = useMemo(
    () =>
      normalizeSectionOrder(DASHBOARD_OVERVIEW_SECTION_IDS, overviewStored),
    [overviewStored],
  );

  const statsOrdered = useMemo(
    () => normalizeSectionOrder(DASHBOARD_STATS_SECTION_IDS, statsStored),
    [statsStored],
  );

  const saveOverviewOrder = useCallback(
    async (next: readonly DashboardOverviewSectionId[]) => {
      await setSettings({ dashboardOverviewSectionOrder: [...next] });
    },
    [setSettings],
  );

  const saveStatsOrder = useCallback(
    async (next: readonly DashboardStatsSectionId[]) => {
      await setSettings({ dashboardStatsSectionOrder: [...next] });
    },
    [setSettings],
  );

  const resetOverviewOrder = useCallback(async () => {
    await setSettings({
      dashboardOverviewSectionOrder: [...DASHBOARD_OVERVIEW_SECTION_IDS],
    });
  }, [setSettings]);

  const resetStatsOrder = useCallback(async () => {
    await setSettings({
      dashboardStatsSectionOrder: [...DASHBOARD_STATS_SECTION_IDS],
    });
  }, [setSettings]);

  if (panel === "overview") {
    return {
      orderedIds: overviewOrdered,
      saveOrder: saveOverviewOrder,
      resetOrder: resetOverviewOrder,
      defaultIds: DASHBOARD_OVERVIEW_SECTION_IDS,
    };
  }

  return {
    orderedIds: statsOrdered,
    saveOrder: saveStatsOrder,
    resetOrder: resetStatsOrder,
    defaultIds: DASHBOARD_STATS_SECTION_IDS,
  };
}
