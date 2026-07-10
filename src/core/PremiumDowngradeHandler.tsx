import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import { navigateToHomeWithVehiclePicker } from "./navigation/navigate";
import { useAuth } from "./providers/AuthProvider";
import { useEntitlements } from "./providers/EntitlementsProvider";

export function PremiumDowngradeHandler() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isPremium, isLoading } = useEntitlements();
  const pathname = usePathname();

  const prevIsPremium = useRef<boolean | null>(null);
  const alertShownForDowngrade = useRef(false);

  useEffect(() => {
    if (isLoading) return;
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

    if (pathname === "/" || pathname === "") {
      navigateToHomeWithVehiclePicker();
      return;
    }

    Alert.alert(
      t("limits.premiumExpiredTitle"),
      t("limits.premiumExpiredBody"),
      [
        {
          text: t("common.ok"),
          onPress: navigateToHomeWithVehiclePicker,
        },
      ],
      { cancelable: false },
    );
  }, [session, isPremium, isLoading, pathname, t]);

  return null;
}
