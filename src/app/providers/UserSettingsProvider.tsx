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
import { useAuth } from "./AuthProvider";

export type UserSettings = {
  currency: "PLN" | "EUR";
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

const DEFAULT_SETTINGS: UserSettings = {
  currency: "PLN",
  distanceUnit: "km",
  fuelUnit: "liters",
  theme: "system",
  language: detectSystemLanguage(),
};

type UserSettingsContextValue = {
  settings: UserSettings | null;
  isLoading: boolean;
  setSettings: (patch: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(
  null
);

function storageKey(userId: string | null | undefined) {
  return `vehico:user-settings:${userId ?? "anon"}`;
}

export function UserSettingsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const key = storageKey(user?.id);

  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    (async () => {
      try {
        // For non-logged-in users, always use system language
        if (!user) {
          const systemLanguage = detectSystemLanguage();
          const defaultSettings: UserSettings = {
            ...DEFAULT_SETTINGS,
            language: systemLanguage,
          };
          if (alive) setSettingsState(defaultSettings);
          await i18n.changeLanguage(systemLanguage);
          setIsLoading(false);
          return;
        }

        // For logged-in users, load from storage
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;

        // Migration note:
        // Older builds stored snake_case keys (distance_unit/fuel_unit). Keep reading them
        // to avoid silently resetting user preferences.
        const merged: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...(parsed ?? {}),
          distanceUnit:
            (parsed?.distanceUnit as UserSettings["distanceUnit"] | undefined) ??
            (parsed?.distance_unit as UserSettings["distanceUnit"] | undefined) ??
            DEFAULT_SETTINGS.distanceUnit,
          fuelUnit:
            (parsed?.fuelUnit as UserSettings["fuelUnit"] | undefined) ??
            (parsed?.fuel_unit as UserSettings["fuelUnit"] | undefined) ??
            DEFAULT_SETTINGS.fuelUnit,
          // Use system language if no language is stored
          language:
            (parsed?.language as UserSettings["language"] | undefined) ??
            detectSystemLanguage(),
        };

        if (alive) setSettingsState(merged);
        // Apply language immediately when loading settings
        await i18n.changeLanguage(merged.language);
      } catch {
        const systemLanguage = detectSystemLanguage();
        const defaultSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          language: systemLanguage,
        };
        if (alive) setSettingsState(defaultSettings);
        await i18n.changeLanguage(systemLanguage);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [key, user]);

  const api = useMemo<UserSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      setSettings: async (patch) => {
        const next: UserSettings = {
          ...(settings ?? DEFAULT_SETTINGS),
          ...patch,
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
    [settings, isLoading, key]
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
