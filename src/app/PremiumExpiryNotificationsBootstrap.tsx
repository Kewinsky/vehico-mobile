import { useEffect, useRef } from "react";

import { useAuth } from "./providers/AuthProvider";
import { useEntitlements } from "./providers/EntitlementsProvider";
import {
  cancelAllPremiumExpiryNotifications,
  reschedulePremiumExpiryNotifications,
} from "../services/push/localPremiumExpiryNotifications";

/**
 * Keep local Premium trial / subscription-ending notifications in sync with
 * the current entitlement snapshot (no DB writes).
 */
export function PremiumExpiryNotificationsBootstrap() {
  const { session, isLoading: authLoading } = useAuth();
  const {
    isLoading: entitlementsLoading,
    isPremium,
    isTrial,
    willRenew,
    premiumExpiresAt,
    showPremiumEndingBanner,
    premiumEndingKind,
  } = useEntitlements();

  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || entitlementsLoading) return;

    const userId = session?.user?.id ?? null;
    if (!userId || !isPremium || !premiumExpiresAt) {
      if (lastKeyRef.current !== "cleared") {
        lastKeyRef.current = "cleared";
        void cancelAllPremiumExpiryNotifications();
      }
      return;
    }

    // Schedule for trials always; for paid only when access will end (cancelled)
    // or when the ending banner is already relevant.
    const kind =
      premiumEndingKind ??
      (isTrial ? "trial" : willRenew === false ? "subscription" : null);
    if (!kind) {
      if (lastKeyRef.current !== "cleared") {
        lastKeyRef.current = "cleared";
        void cancelAllPremiumExpiryNotifications();
      }
      return;
    }

    // For renewing trials, still notify before conversion/charge.
    if (kind === "subscription" && willRenew !== false && !showPremiumEndingBanner) {
      if (lastKeyRef.current !== "cleared") {
        lastKeyRef.current = "cleared";
        void cancelAllPremiumExpiryNotifications();
      }
      return;
    }

    const key = `${userId}:${kind}:${premiumExpiresAt}:${String(willRenew)}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    void reschedulePremiumExpiryNotifications({
      kind,
      expiresAtIso: premiumExpiresAt,
      willRenew,
    });
  }, [
    authLoading,
    entitlementsLoading,
    session?.user?.id,
    isPremium,
    isTrial,
    willRenew,
    premiumExpiresAt,
    showPremiumEndingBanner,
    premiumEndingKind,
  ]);

  return null;
}
