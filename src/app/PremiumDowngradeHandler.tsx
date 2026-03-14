import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "./providers/AuthProvider";
import { useEntitlements } from "./providers/EntitlementsProvider";
import { navigationRef } from "./navigationRef";

function currentRouteName(): string | null {
  if (!navigationRef.isReady()) return null;
  return navigationRef.getCurrentRoute()?.name ?? null;
}

function redirectToVehiclesAndShowPicker() {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: "Vehicles", params: { showVehiclePicker: true } }],
  });
}

export function PremiumDowngradeHandler() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isPremium, isLoading } = useEntitlements();

  const prevIsPremium = useRef<boolean | null>(null);
  const alertShownForDowngrade = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    // Only treat premium→free as "downgrade" when user is still logged in. On logout, isPremium becomes false but we must not show the alert or reset to Vehicles (that screen isn't in the unauthenticated stack).
    if (!session) {
      prevIsPremium.current = isPremium;
      return;
    }

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
      // Downgrade now seeds a fallback free-plan vehicle in DB, so force the
      // picker explicitly when user already sits on Vehicles.
      redirectToVehiclesAndShowPicker();
      return;
    }

    Alert.alert(
      t("limits.premiumExpiredTitle"),
      t("limits.premiumExpiredBody"),
      [
        {
          text: t("common.ok"),
          onPress: redirectToVehiclesAndShowPicker,
        },
      ],
      { cancelable: false },
    );
  }, [session, isPremium, isLoading, t]);

  return null;
}
