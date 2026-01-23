import React, { useEffect } from "react";
import { Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as LinkingModule from "expo-linking";

import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { ThemeProvider, useTheme } from "../ui/ThemeProvider";
import { AppToasts } from "../ui/toast/AppToasts";
import { setThemeColorsGetter } from "../ui/toast/toast";
import { supabase } from "../services/supabase/client";

function AppContent() {
  const { theme } = useTheme();
  
  // Set theme colors getter for toast functions
  React.useEffect(() => {
    setThemeColorsGetter(() => ({
      bg: theme.colors.bg,
      fg: theme.colors.fg,
      accent: theme.colors.accent,
      danger: theme.colors.danger,
      muted: theme.colors.muted,
    }));
  }, [theme]);

  // Handle deep linking for magic link authentication
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url || !url.includes('auth/magic-link')) return;

      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const linking = {
    prefixes: ['vehico://', 'exp://', LinkingModule.createURL('/')],
    config: {
      screens: {
        Auth: 'auth',
      },
    },
  };

  return (
    <>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <AppToasts />
    </>
  );
}

export function Root() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

