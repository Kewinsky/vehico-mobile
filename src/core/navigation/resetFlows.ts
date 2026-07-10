import { router } from "expo-router";

import { routes } from "./routes";
import { setTransientParams, transientKeys } from "./transientParams";

type MarketplacePostOptionsParams = {
  content: { pl: string; en: string };
  vehicleTitle: string;
  vehicleId: string;
  postTitle?: string | null;
  generatedAt?: string;
};

type PublicReportOptionsParams = {
  url: string;
  vehicleTitle: string;
  vehicleId: string;
  reportTitle?: string | null;
  generatedAt?: string;
};

export function resetToMarketplacePostFlow(
  vehicleId: string,
  options: MarketplacePostOptionsParams,
): void {
  setTransientParams(transientKeys.marketplacePostOptions, options);
  router.dismissAll();
  router.replace(routes.home());
  router.push(routes.vehicleDashboard(vehicleId));
  router.push(routes.share(vehicleId));
  router.push(routes.marketplace(vehicleId));
  router.push(routes.marketplacePostOptions(vehicleId));
}

export function resetToPublicReportOptionsFlow(
  vehicleId: string,
  options: PublicReportOptionsParams,
): void {
  setTransientParams(transientKeys.publicReportOptions, options);
  router.dismissAll();
  router.replace(routes.home());
  router.push(routes.vehicleDashboard(vehicleId));
  router.push(routes.share(vehicleId));
  router.push(routes.publicReport(vehicleId));
  router.push(routes.publicReportOptions(vehicleId));
}
