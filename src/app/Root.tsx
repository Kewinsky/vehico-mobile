import React, { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import { supabase } from "../services/supabase/client";

function AppContent() {
  const { theme } = useTheme();
  const isApplyingMagicLinkRef = useRef(false);
  const processedMagicLinksRef = useRef<Set<string>>(new Set());

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

  // Handle deep linking for magic link authentication
  useEffect(() => {
    const parseMagicLinkError = (url: string): null | "expired" => {
      // Supabase can put errors in fragment (#...) or query (?...)
      const hashIndex = url.indexOf("#");
      const fragment = hashIndex >= 0 ? url.substring(hashIndex + 1) : "";
      const queryIndex = url.indexOf("?");
      const query = queryIndex >= 0 ? url.substring(queryIndex + 1) : "";
      const params = new URLSearchParams(fragment || query);

      const error = params.get("error") ?? "";
      const errorCode = params.get("error_code") ?? "";
      const errorDesc = params.get("error_description") ?? "";
      const haystack = `${error} ${errorCode} ${errorDesc}`.toLowerCase();

      if (!haystack) return null;
      if (haystack.includes("expired")) return "expired";
      if (haystack.includes("invalid") && haystack.includes("token"))
        return "expired";
      return "expired";
    };

    const openAuthErrorModal = (error: "expired") => {
      const navigate = () =>
        navigationRef.navigate("Auth", { magicLinkError: error });

      if (navigationRef.isReady()) {
        navigate();
        return;
      }

      const startedAt = Date.now();
      const id = setInterval(() => {
        if (navigationRef.isReady()) {
          clearInterval(id);
          navigate();
          return;
        }
        if (Date.now() - startedAt > 5000) {
          clearInterval(id);
        }
      }, 100);
    };

    const handleDeepLink = async (url: string | null) => {
      if (!url || !url.includes("auth/magic-link")) return;

      const nextError = parseMagicLinkError(url);
      if (nextError) {
        openAuthErrorModal(nextError);
        return;
      }

      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) return;

      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const magicLinkKey = `${accessToken.slice(0, 16)}:${refreshToken.slice(0, 16)}`;

        if (processedMagicLinksRef.current.has(magicLinkKey)) return;
        if (isApplyingMagicLinkRef.current) return;

        isApplyingMagicLinkRef.current = true;
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.warn("Magic link setSession failed:", error.message);
          } else {
            processedMagicLinksRef.current.add(magicLinkKey);
            // Keep memory bounded for long app sessions.
            if (processedMagicLinksRef.current.size > 20) {
              const firstKey = processedMagicLinksRef.current.values().next()
                .value as string | undefined;
              if (firstKey) processedMagicLinksRef.current.delete(firstKey);
            }
          }
        } finally {
          isApplyingMagicLinkRef.current = false;
        }
      }
    };

    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener(
      "url",
      ({ url }: { url: string }) => {
        handleDeepLink(url);
      },
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
  );
}
