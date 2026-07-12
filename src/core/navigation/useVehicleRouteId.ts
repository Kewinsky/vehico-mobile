import { useMemo } from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

/**
 * Resolves the current vehicle id from the URL. NativeTabs can drop parent
 * segment params from useLocalSearchParams, so pathname + global params are
 * used as fallbacks.
 */
export function useVehicleRouteId(): string {
  const pathname = usePathname();
  const { vehicleId: globalVehicleId } = useGlobalSearchParams<{
    vehicleId?: string;
  }>();

  return useMemo(() => {
    const fromGlobal = normalizeParam(globalVehicleId);
    if (fromGlobal && fromGlobal !== "new") return fromGlobal;

    const match = pathname.match(/^\/vehicle\/([^/]+)/);
    const fromPath = match?.[1]?.trim() ?? "";
    if (fromPath && fromPath !== "new") return fromPath;

    return "";
  }, [globalVehicleId, pathname]);
}
