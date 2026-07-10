import { useMemo } from "react";

import { useUserSettings } from "../providers/UserSettingsProvider";
import { getUnitDisplay, type UnitDisplay } from "../../utils/unitGroups";

export function useUnitDisplay(): UnitDisplay {
  const { settings } = useUserSettings();
  return useMemo(() => getUnitDisplay(settings), [settings]);
}
