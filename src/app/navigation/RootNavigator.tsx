import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "./types";
import { LandingScreen } from "../../screens/LandingScreen";
import { AuthScreen } from "../../screens/AuthScreen";
import { TermsOfUseScreen } from "../../screens/TermsOfUseScreen";
import { PrivacyPolicyScreen } from "../../screens/PrivacyPolicyScreen";
import { VehiclesScreen } from "../../screens/VehiclesScreen";
import { VehicleFormScreen } from "../../screens/VehicleFormScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";
import { SettingsScreen } from "../../screens/SettingsScreen";
import { QuickActionsProvider } from "../providers/QuickActionsProvider";
import { MainTabsNavigator } from "./MainTabsNavigator";

function MainTabsWithQuickActions() {
  return (
    <QuickActionsProvider>
      <MainTabsNavigator />
    </QuickActionsProvider>
  );
}

/** Root stack param list – used for navigation ref and root-level screens. */
export type AppStackParamList = RootStackParamList;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={session ? "authenticated" : "unauthenticated"}
      screenOptions={{ headerShown: false }}
      initialRouteName={session ? "Vehicles" : "Landing"}
    >
      {!session ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Vehicles" component={VehiclesScreen} />
          <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="MainTabs" component={MainTabsWithQuickActions} />
        </>
      )}
    </Stack.Navigator>
  );
}
