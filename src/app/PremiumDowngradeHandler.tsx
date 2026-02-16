import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { useEntitlements } from "./providers/EntitlementsProvider";
import { navigationRef } from "./navigationRef";

function currentRouteName(): string | null {
  if (!navigationRef.isReady()) return null;
  return navigationRef.getCurrentRoute()?.name ?? null;
}

function redirectToVehicles() {
  if (!navigationRef.isReady()) return;
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
    if (route === "Vehicles") {
      // User is already on VehiclesScreen → picker will show there automatically
      return;
    }

    Alert.alert(
      t("limits.premiumExpiredTitle"),
      t("limits.premiumExpiredBody"),
      [
        {
          text: t("limits.chooseVehicle"),
          onPress: redirectToVehicles,
        },
      ],
      { cancelable: false },
    );
  }, [isPremium, isLoading, t]);

  return null;
}
