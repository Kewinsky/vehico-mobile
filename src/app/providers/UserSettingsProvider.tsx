import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { i18n } from "../../i18n/i18n";
import type { SupportedLanguage } from "../../i18n/i18n";
import { useAuth } from "./AuthProvider";

export type UserSettings = {
  currency: "PLN" | "EUR";
  distance_unit: "km" | "miles";
  fuel_unit: "liters" | "gallons";
  theme: "system" | "light" | "dark";
  language: SupportedLanguage;
};

const DEFAULT_SETTINGS: UserSettings = {
  currency: "PLN",
  distance_unit: "km",
  fuel_unit: "liters",
  theme: "system",
  language: "en",
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
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as Partial<UserSettings>) : null;
        const merged: UserSettings = { ...DEFAULT_SETTINGS, ...(parsed ?? {}) };

        if (alive) setSettingsState(merged);
        // Apply language immediately when loading settings
        await i18n.changeLanguage(merged.language);
      } catch {
        if (alive) setSettingsState({ ...DEFAULT_SETTINGS });
        await i18n.changeLanguage(DEFAULT_SETTINGS.language);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [key]);

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
