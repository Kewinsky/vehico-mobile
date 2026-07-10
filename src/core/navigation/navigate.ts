import { router } from "expo-router";

import { routes } from "./routes";

export function navigateToReminderForm(
  vehicleId: string,
  reminderId: string,
): void {
  router.push(routes.reminderForm(vehicleId, reminderId));
}

export function navigateToVehicleDashboard(vehicleId: string): void {
  router.push(routes.vehicleDashboard(vehicleId));
}

export function navigateToHomeWithVehiclePicker(): void {
  router.replace(routes.home({ showVehiclePicker: true }));
}

export function isNavigationReady(): boolean {
  return router.canDismiss() || true;
}
