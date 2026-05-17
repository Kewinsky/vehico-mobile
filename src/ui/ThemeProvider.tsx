import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import type { AppTheme, ThemeMode } from './theme';
import { getTheme } from './theme';
import { useUserSettings } from '../app/providers/UserSettingsProvider';

type ThemeContextValue = {
  mode: ThemeMode;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const { settings } = useUserSettings();

  const mode: ThemeMode = useMemo(() => {
    const pref = settings?.theme ?? 'system';
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [settings?.theme, systemScheme]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const value = useMemo<ThemeContextValue>(() => ({ mode, theme }), [mode, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

