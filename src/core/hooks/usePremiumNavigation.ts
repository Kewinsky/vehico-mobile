import { useMemo } from "react";
import { useRouter } from "expo-router";

import { routes } from "../navigation/routes";

/**
 * Adapts expo-router navigation to the MinimalNavigation shape expected by
 * `src/ui/limits/entitlementAlerts.ts` (which predates the move to expo-router).
 */
export function usePremiumNavigation() {
  const router = useRouter();
  return useMemo(
    () => ({
      navigate: (screen: string) => {
        if (screen === "Shop") {
          router.push(routes.shop());
        }
      },
    }),
    [router],
  );
}
