import React, { useEffect, useMemo } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as LinkingModule from "expo-linking";
import * as Notifications from "expo-notifications";

import "../i18n/i18n";
import { AppBootGate } from "./AppBootGate";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigationRef";
import { PremiumDowngradeHandler } from "./PremiumDowngradeHandler";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { EntitlementsProvider } from "./providers/EntitlementsProvider";
import { ThemeProvider, useTheme } from "../ui/ThemeProvider";
import { ExclusiveSwipeProvider } from "../ui/components/common/ExclusiveSwipeable";
import { ErrorBoundary } from "../ui/components/common/ErrorBoundary";
import { AppToasts } from "../ui/toast/AppToasts";
import { TextPromptHost } from "../ui/prompt/TextPromptHost";
import { FormalityNotificationsBootstrap } from "./FormalityNotificationsBootstrap";

function AppContent() {
  // Handle tap on local notification (reminder) – navigate to ReminderForm (edit)
  useEffect(() => {
    const navigateFromNotification = (data: {
      reminderId?: string;
      vehicleId?: string;
      formalityKind?: "insurance" | "inspection";
    }) => {
      if (!data?.vehicleId || !navigationRef.isReady()) return;
      if (data.reminderId) {
        navigationRef.navigate("ReminderForm", {
          vehicleId: data.vehicleId,
          reminderId: data.reminderId,
        });
        return;
      }
      if (data.formalityKind) {
        navigationRef.navigate("VehicleDashboard", {
          vehicleId: data.vehicleId,
          screen: "Overview",
        });
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
        if (navigationRef.isReady()) {
          clearInterval(id);
          navigateFromNotification(data ?? {});
        }
      }, 100);
      setTimeout(() => clearInterval(id), 5000);
    });

    return () => sub.remove();
  }, []);

  const linking = {
    prefixes: ["vehico://", "exp://", LinkingModule.createURL("/")],
    config: {
      screens: {
        Auth: "auth",
      },
    },
  };

  const { theme, mode } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.bg,
        card: theme.colors.card,
        text: theme.colors.fg,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [mode, theme]);

  return (
    <>
      <FormalityNotificationsBootstrap />
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={navigationTheme}
      >
        <RootNavigator />
        <PremiumDowngradeHandler />
      </NavigationContainer>
      <AppToasts />
      <TextPromptHost />
    </>
  );
}

export function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppBootGate>
            <UserSettingsProvider>
              <EntitlementsProvider>
                <ThemeProvider>
                  <ExclusiveSwipeProvider>
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
                  </ExclusiveSwipeProvider>
                </ThemeProvider>
              </EntitlementsProvider>
            </UserSettingsProvider>
          </AppBootGate>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
