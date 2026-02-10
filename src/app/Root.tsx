import React, { useEffect } from "react";
import { Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as LinkingModule from "expo-linking";
import * as Notifications from "expo-notifications";

import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigationRef";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { EntitlementsProvider } from "./providers/EntitlementsProvider";
import { ThemeProvider, useTheme } from "../ui/ThemeProvider";
import { AppToasts } from "../ui/toast/AppToasts";
import { setThemeColorsGetter } from "../ui/toast/toast";
import { supabase } from "../services/supabase/client";

function AppContent() {
  const { theme } = useTheme();

  // Handle tap on local notification (reminder) — navigate to ReminderForm (edit)
  useEffect(() => {
    const navigateFromNotification = (data: {
      reminderId?: string;
      vehicleId?: string;
    }) => {
      if (data?.reminderId && data?.vehicleId && navigationRef.isReady()) {
        navigationRef.navigate("ReminderForm", {
          vehicleId: data.vehicleId,
          reminderId: data.reminderId,
        });
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { reminderId?: string; vehicleId?: string }
          | undefined;
        navigateFromNotification(data ?? {});
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response?.notification.request.content.data) return;
      const data = response.notification.request.content.data as
        | { reminderId?: string; vehicleId?: string }
        | undefined;
      const id = setInterval(() => {
        if (navigationRef.isReady()) {
          clearInterval(id);
          navigateFromNotification(data ?? {});
        }
      }, 100);
      setTimeout(() => clearInterval(id), 5000);
    });

    return () => sub.remove();
  }, []);

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
      if (!url || !url.includes("auth/magic-link")) return;

      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) return;

      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener(
      "url",
      ({ url }: { url: string }) => {
        handleDeepLink(url);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const linking = {
    prefixes: ["vehico://", "exp://", LinkingModule.createURL("/")],
    config: {
      screens: {
        Auth: "auth",
      },
    },
  };

  return (
    <>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <AppToasts />
    </>
  );
}

export function Root() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UserSettingsProvider>
          <EntitlementsProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </EntitlementsProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
