import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import "../i18n/i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import { AuthProvider } from "./providers/AuthProvider";
import { UserSettingsProvider } from "./providers/UserSettingsProvider";
import { ThemeProvider } from "../ui/ThemeProvider";

export function Root() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <ThemeProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

