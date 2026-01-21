import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigationContainerRef } from "@react-navigation/native";
import { AppState } from "react-native";

import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import type { AppStackParamList } from "./navigation/RootNavigator";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { ThemeProvider } from "../ui/ThemeProvider";
import { AppToasts } from "../ui/toast/AppToasts";
import { scheduleAllReminders } from "../services/reminders/reminderNotifications";
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
} from "../services/notifications/notificationsService";

function AppContent() {
  const { session } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<AppStackParamList>>(null);

  // Initialize notifications and schedule reminders
  useEffect(() => {
    if (!session) return;

    // Schedule all reminders on app start
    void scheduleAllReminders();

    // Handle app state changes - reschedule when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void scheduleAllReminders();
      }
    });

    // Handle notification taps
    const notificationListener = addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          reminderId?: string;
          vehicleId?: string;
        };
        if (data?.reminderId && data?.vehicleId && navigationRef.current) {
          navigationRef.current.navigate("ReminderDetail", {
            reminderId: data.reminderId,
            vehicleId: data.vehicleId,
          });
        }
      }
    );

    // Check if app was opened from notification
    void (async () => {
      const response = await getLastNotificationResponse();
      if (response && navigationRef.current) {
        const data = response.notification.request.content.data as {
          reminderId?: string;
          vehicleId?: string;
        };
        if (data?.reminderId && data?.vehicleId) {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            navigationRef.current?.navigate("ReminderDetail", {
              reminderId: data.reminderId!,
              vehicleId: data.vehicleId!,
            });
          }, 500);
        }
      }
    })();

    return () => {
      subscription.remove();
      notificationListener.remove();
    };
  }, [session]);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export function Root() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <ThemeProvider>
          <AppContent />
          <AppToasts />
        </ThemeProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

