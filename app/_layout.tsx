import "../src/core/bootstrap";
import "../src/i18n/i18n";

import React, { useEffect, useMemo, type PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Sentry from "@sentry/react-native";

import { BRAND_FONT_FAMILY } from "@/ui/components/branding/BrandHero";
import { PremiumDowngradeHandler } from "@/core/PremiumDowngradeHandler";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { UserSettingsProvider } from "@/core/providers/UserSettingsProvider";
import { EntitlementsProvider } from "@/core/providers/EntitlementsProvider";
import { ThemeProvider, useTheme } from "@/ui/ThemeProvider";
import { ExclusiveSwipeProvider } from "@/ui/components/common/ExclusiveSwipeable";
import { ErrorBoundary } from "@/ui/components/common/ErrorBoundary";
import { AppToasts } from "@/ui/toast/AppToasts";
import { FormalityNotificationsBootstrap } from "@/core/FormalityNotificationsBootstrap";
import {
  navigateToReminderForm,
  navigateToVehicleDashboard,
} from "@/core/navigation/navigate";

function NotificationBootstrap() {
  useEffect(() => {
    const navigateFromNotification = (data: {
      reminderId?: string;
      vehicleId?: string;
      formalityKind?: "insurance" | "inspection";
    }) => {
      if (!data?.vehicleId) return;
      if (data.reminderId) {
        navigateToReminderForm(data.vehicleId, data.reminderId);
        return;
      }
      if (data.formalityKind) {
        navigateToVehicleDashboard(data.vehicleId);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | {
              reminderId?: string;
              vehicleId?: string;
              formalityKind?: "insurance" | "inspection";
            }
          | undefined;
        navigateFromNotification(data ?? {});
      },
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response?.notification.request.content.data) return;
      const data = response.notification.request.content.data as
        | {
            reminderId?: string;
            vehicleId?: string;
            formalityKind?: "insurance" | "inspection";
          }
        | undefined;
      const id = setInterval(() => {
        clearInterval(id);
        navigateFromNotification(data ?? {});
      }, 100);
      setTimeout(() => clearInterval(id), 5000);
    });

    return () => sub.remove();
  }, []);

  return null;
}

/**
 * Bridge the app theme into the navigation theme so native containers
 * (native tabs screens, stack transitions) use the app background instead of
 * the default white one, which otherwise flashes on tab switches in dark mode.
 */
function AppNavigationThemeProvider({ children }: PropsWithChildren) {
  const { theme, mode } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.bg,
        card: theme.colors.bg,
        text: theme.colors.fg,
        border: theme.colors.border,
      },
    };
  }, [mode, theme]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      {children}
    </NavigationThemeProvider>
  );
}

function RootLayoutNav() {
  const [fontsLoaded] = useFonts({
    [BRAND_FONT_FAMILY]: require("../fonts/ChironGoRoundTC-ExtraBold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <FormalityNotificationsBootstrap />
      <NotificationBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack>
      <PremiumDowngradeHandler />
      <AppToasts />
    </>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <UserSettingsProvider>
            <EntitlementsProvider>
              <ThemeProvider>
                <AppNavigationThemeProvider>
                  <ExclusiveSwipeProvider>
                    <ErrorBoundary>
                      <RootLayoutNav />
                    </ErrorBoundary>
                  </ExclusiveSwipeProvider>
                </AppNavigationThemeProvider>
              </ThemeProvider>
            </EntitlementsProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
