import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { useEntitlements } from "./providers/EntitlementsProvider";
import { navigationRef } from "./navigationRef";

const PREMIUM_ONLY_ROUTES = new Set<string>([
  // Entry point
  "Share",
  // Public report flow
  "PublicReport",
  "PublicReportConfigure",
  "PublicReportSummary",
  "PublicReportOptions",
  "PublicReportHistory",
  // Marketplace flow
  "Marketplace",
  "MarketplaceConfigure",
  "MarketplaceSummary",
  "MarketplacePostOptions",
  "MarketplacePost",
  "MarketplacePostHistory",
  "MarketplacePostEdit",
]);

function currentRouteName(): string | null {
  if (!navigationRef.isReady()) return null;
  return navigationRef.getCurrentRoute()?.name ?? null;
}

function currentVehicleIdParam(): string | null {
  if (!navigationRef.isReady()) return null;
  const params = navigationRef.getCurrentRoute()?.params as
    | { vehicleId?: string }
    | undefined;
  return typeof params?.vehicleId === "string" ? params.vehicleId : null;
}

function redirectOutOfPremiumFlow() {
  if (!navigationRef.isReady()) return;
  const vehicleId = currentVehicleIdParam();
  if (vehicleId) {
    // Keep Vehicles in stack so back from VehicleDashboard returns to list
    navigationRef.reset({
      index: 1,
      routes: [
        { name: "Vehicles" },
        { name: "VehicleDashboard", params: { vehicleId } },
      ],
    });
    return;
  }
  navigationRef.reset({
    index: 0,
    routes: [{ name: "Vehicles" }],
  });
}

export function PremiumDowngradeHandler() {
  const { t } = useTranslation();
  const { isPremium, isLoading } = useEntitlements();

  const prevIsPremium = useRef<boolean | null>(null);
  const alertShownForDowngrade = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (prevIsPremium.current == null) {
      prevIsPremium.current = isPremium;
      return;
    }

    const downgraded = prevIsPremium.current === true && isPremium === false;
    prevIsPremium.current = isPremium;

    if (!downgraded) return;
    if (alertShownForDowngrade.current) return;
    alertShownForDowngrade.current = true;

    const route = currentRouteName();
    if (route && PREMIUM_ONLY_ROUTES.has(route)) {
      redirectOutOfPremiumFlow();
    }

    Alert.alert(t("limits.premiumRequiredTitle"), t("limits.premiumRequiredBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("limits.upgradeToPremium"),
        onPress: () => {
          if (!navigationRef.isReady()) return;
          navigationRef.navigate("Shop");
        },
      },
    ]);
  }, [isPremium, isLoading, t]);

  return null;
}

