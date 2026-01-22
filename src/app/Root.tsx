import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { ThemeProvider, useTheme } from "../ui/ThemeProvider";
import { AppToasts } from "../ui/toast/AppToasts";
import { setThemeColorsGetter } from "../ui/toast/toast";

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

  return (
    <>
      <NavigationContainer>
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

