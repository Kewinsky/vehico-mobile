import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, usePathname } from "expo-router";

import { useAuth } from "@/core/providers/AuthProvider";

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const hasCompletedOnboarding =
    session.user.user_metadata?.has_completed_onboarding === true;

  if (!hasCompletedOnboarding && pathname !== "/onboarding") {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTransparent: true,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="onboarding" />
      <Stack.Screen
        name="vehicle/new"
        options={{
          presentation: "fullScreenModal",
          headerShown: true,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="vehicle/[vehicleId]" />
      <Stack.Screen name="workshops/index" />
      <Stack.Screen
        name="workshops/[workshopId]"
        options={{
          presentation: "modal",
          headerShown: true,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="(modals)" options={{ presentation: "modal" }} />
    </Stack>
  );
}
