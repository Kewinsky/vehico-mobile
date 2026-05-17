import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as LinkingModule from "expo-linking";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";

import { BRAND_FONT_FAMILY } from "../ui/components/branding/BrandHero";
import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigationRef";
import { PremiumDowngradeHandler } from "./PremiumDowngradeHandler";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { EntitlementsProvider } from "./providers/EntitlementsProvider";
import { ThemeProvider, useTheme } from "../ui/ThemeProvider";
import { ErrorBoundary } from "../ui/components/common/ErrorBoundary";
import { AppToasts } from "../ui/toast/AppToasts";
import { setThemeColorsGetter } from "../ui/toast/toast";
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
      },
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
        <PremiumDowngradeHandler />
      </NavigationContainer>
      <AppToasts />
    </>
  );
}

export function Root() {
  const [fontsLoaded] = useFonts({
    [BRAND_FONT_FAMILY]: require("../../fonts/ChironGoRoundTC-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <UserSettingsProvider>
            <EntitlementsProvider>
              <ThemeProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </ThemeProvider>
            </EntitlementsProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
