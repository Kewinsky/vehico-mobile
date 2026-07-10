import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/core/providers/AuthProvider";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (session) {
    const hasCompletedOnboarding =
      session.user.user_metadata?.has_completed_onboarding === true;
    return (
      <Redirect href={hasCompletedOnboarding ? "/" : "/onboarding"} />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "",
        headerShadowVisible: false,
        headerTransparent: true,
        headerBackVisible: false,
      }}
    />
  );
}
