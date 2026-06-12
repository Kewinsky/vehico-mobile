import { useEffect, useRef } from "react";

import { useAuth } from "./providers/AuthProvider";
import { listVehicles } from "../services/vehicles/vehiclesRepo";
import {
  cancelAllFormalityNotifications,
  rescheduleAllVehicleFormalityNotifications,
} from "../services/push/localFormalityNotifications";

/** Re-sync insurance/inspection local notifications when auth session changes. */
export function FormalityNotificationsBootstrap() {
  const { session, isLoading } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const userId = session?.user?.id ?? null;
    if (userId === lastUserIdRef.current) return;
    lastUserIdRef.current = userId;

    void (async () => {
      if (!userId) {
        await cancelAllFormalityNotifications();
        return;
      }
      try {
        const vehicles = await listVehicles();
        await rescheduleAllVehicleFormalityNotifications(vehicles);
      } catch {
        // Non-blocking: notifications will sync on next vehicle save.
      }
    })();
  }, [session, isLoading]);

  return null;
}
