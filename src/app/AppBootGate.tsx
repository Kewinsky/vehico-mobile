import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useState } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { useAuth } from "./providers/AuthProvider";
import { BRAND_FONT_FAMILY } from "../ui/components/branding/BrandHero";
import { AppBootScreen } from "../ui/components/branding/AppBootScreen";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden in fast refresh / tests.
});

export function AppBootGate({ children }: PropsWithChildren) {
  const { isLoading: isAuthLoading } = useAuth();
  const [splashHidden, setSplashHidden] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    [BRAND_FONT_FAMILY]: require("../../fonts/ChironGoRoundTC-ExtraBold.ttf"),
  });

  const isBooting = !fontsLoaded && !fontError;
  const isReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  const hideSplash = useCallback(async () => {
    if (splashHidden) return;
    try {
      await SplashScreen.hideAsync();
    } catch {
      // Ignore if splash is already gone.
    } finally {
      setSplashHidden(true);
    }
  }, [splashHidden]);

  useEffect(() => {
    if (isReady) {
      void hideSplash();
    }
  }, [hideSplash, isReady]);

  if (isBooting || isAuthLoading) {
    return <AppBootScreen fontsReady={fontsLoaded} />;
  }

  return children;
}
