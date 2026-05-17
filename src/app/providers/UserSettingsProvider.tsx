import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import { i18n } from "../../i18n/i18n";
import type { SupportedLanguage } from "../../i18n/i18n";
import {
  getUnitGroupDefinition,
  resolveUnitGroupId,
  settingsPatchForUnitGroup,
  type UnitGroupId,
} from "../../utils/unitGroups";
import { useAuth } from "./AuthProvider";

export type UserSettings = {
  currency: "PLN" | "USD";
  unitGroup?: UnitGroupId;
  distanceUnit: "km" | "miles";
  fuelUnit: "liters" | "gallons";
  theme: "system" | "light" | "dark";
  language: SupportedLanguage;
};

// Detect system language for default settings
function detectSystemLanguage(): SupportedLanguage {
  const systemLocale = Localization.getLocales()[0]?.languageCode;
  return systemLocale === "pl" ? "pl" : "en";
}

const DEFAULT_UNIT_GROUP: UnitGroupId = "european";

const DEFAULT_SETTINGS: UserSettings = {
  currency: "PLN",
  unitGroup: DEFAULT_UNIT_GROUP,
  ...settingsPatchForUnitGroup(DEFAULT_UNIT_GROUP),
  theme: "system",
  language: detectSystemLanguage(),
};

function normalizeUserSettings(
  parsed: Record<string, unknown> | null,
): UserSettings {
  const distanceUnit =
    (parsed?.distanceUnit as UserSettings["distanceUnit"] | undefined) ??
    (parsed?.distance_unit as UserSettings["distanceUnit"] | undefined) ??
    DEFAULT_SETTINGS.distanceUnit;
  const fuelUnit =
    (parsed?.fuelUnit as UserSettings["fuelUnit"] | undefined) ??
    (parsed?.fuel_unit as UserSettings["fuelUnit"] | undefined) ??
    DEFAULT_SETTINGS.fuelUnit;
  const unitGroup = resolveUnitGroupId({
    ...DEFAULT_SETTINGS,
    ...(parsed ?? {}),
    distanceUnit,
    fuelUnit,
    unitGroup: parsed?.unitGroup as UnitGroupId | undefined,
  });
  const group = getUnitGroupDefinition(unitGroup);

  return {
    ...DEFAULT_SETTINGS,
    ...(parsed ?? {}),
    currency:
      (parsed?.currency as UserSettings["currency"] | undefined) ??
      DEFAULT_SETTINGS.currency,
    unitGroup,
    distanceUnit: group.distanceUnit,
    fuelUnit: group.fuelUnit,
    theme:
      (parsed?.theme as UserSettings["theme"] | undefined) ??
      DEFAULT_SETTINGS.theme,
    language:
      (parsed?.language as UserSettings["language"] | undefined) ??
      detectSystemLanguage(),
  };
}

type UserSettingsContextValue = {
  settings: UserSettings | null;
  isLoading: boolean;
  setSettings: (patch: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(
  null,
);

function storageKey(userId: string | null | undefined) {
  return `vehico:user-settings:${userId ?? "anon"}`;
}

export function UserSettingsProvider({ children }: PropsWithChildren) {
  const { user, isLoading: authLoading } = useAuth();
  const key = storageKey(user?.id);

  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    (async () => {
      try {
        if (authLoading) {
          return;
        }

        // For non-logged-in users, always use system language
        if (!user) {
          const systemLanguage = detectSystemLanguage();
          const defaultSettings: UserSettings = {
            ...DEFAULT_SETTINGS,
            language: systemLanguage,
          };
          if (alive) setSettingsState(defaultSettings);
          if (alive) {
            await i18n.changeLanguage(systemLanguage);
            setIsLoading(false);
          }
          return;
        }

        // For logged-in users, load from storage
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw
          ? (JSON.parse(raw) as Record<string, unknown>)
          : null;

        // Migration note:
        // Older builds stored snake_case keys (distance_unit/fuel_unit). Keep reading them
        // to avoid silently resetting user preferences.
        const merged = normalizeUserSettings(parsed);

        if (alive) setSettingsState(merged);
        // Apply language immediately when loading settings
        if (alive) {
          await i18n.changeLanguage(merged.language);
        }
      } catch {
        const systemLanguage = detectSystemLanguage();
        const defaultSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          language: systemLanguage,
        };
        if (alive) setSettingsState(defaultSettings);
        if (alive) {
          await i18n.changeLanguage(systemLanguage);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authLoading, key, user]);

  const api = useMemo<UserSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      setSettings: async (patch) => {
        const base = settings ?? DEFAULT_SETTINGS;
        const unitPatch = patch.unitGroup
          ? settingsPatchForUnitGroup(patch.unitGroup)
          : {};
        const next: UserSettings = {
          ...base,
          ...patch,
          ...unitPatch,
        };
        setSettingsState(next);
        await AsyncStorage.setItem(key, JSON.stringify(next));
        if (patch.language) await i18n.changeLanguage(next.language);
      },
      resetSettings: async () => {
        const next = { ...DEFAULT_SETTINGS };
        setSettingsState(next);
        await AsyncStorage.removeItem(key);
        await i18n.changeLanguage(next.language);
      },
    }),
    [settings, isLoading, key],
  );

  return (
    <UserSettingsContext.Provider value={api}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx)
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
