import { Stack } from "expo-router";

import { VehicleDashboardProvider } from "@/screens/header/vehicleDashboard/VehicleDashboardProvider";
import { VehicleDashboardModals } from "@/screens/header/vehicleDashboard/VehicleDashboardModals";

const nativeHeaderScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerTransparent: true,
} as const;

const modalScreenOptions = {
  presentation: "modal" as const,
  headerShown: true,
  headerShadowVisible: false,
};

export default function VehicleLayout() {
  return (
    <VehicleDashboardProvider>
      <Stack screenOptions={nativeHeaderScreenOptions}>
        <Stack.Screen
          name="(dashboard)"
          options={{
            headerShown: true,
            headerShadowVisible: false,
            headerTransparent: true,
            title: "",
          }}
        />
        <Stack.Screen name="manage" />
        <Stack.Screen name="section-order" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="service-history/index" />
        <Stack.Screen
          name="service-history/filters"
          options={modalScreenOptions}
        />
        <Stack.Screen
          name="service-history/[entryId]"
          options={modalScreenOptions}
        />
        <Stack.Screen name="fuel/index" />
        <Stack.Screen name="fuel/filters" options={modalScreenOptions} />
        <Stack.Screen name="fuel/[entryId]" options={modalScreenOptions} />
        <Stack.Screen name="reminders/index" />
        <Stack.Screen name="reminders/filters" options={modalScreenOptions} />
        <Stack.Screen
          name="reminders/[reminderId]"
          options={modalScreenOptions}
        />
        <Stack.Screen name="attachments/index" />
        <Stack.Screen name="attachments/filters" options={modalScreenOptions} />
        <Stack.Screen name="wheels/index" />
        <Stack.Screen name="wheels/tires/index" />
        <Stack.Screen
          name="wheels/tires/[tireId]"
          options={modalScreenOptions}
        />
        <Stack.Screen name="wheels/rims/index" />
        <Stack.Screen name="wheels/rims/filters" options={modalScreenOptions} />
        <Stack.Screen
          name="wheels/rims/[wheelId]"
          options={modalScreenOptions}
        />
        <Stack.Screen name="share/index" />
        <Stack.Screen name="share/public-report/index" />
        <Stack.Screen name="share/public-report/configure" />
        <Stack.Screen name="share/public-report/summary" />
        <Stack.Screen name="share/public-report/options" />
        <Stack.Screen name="share/public-report/history" />
        <Stack.Screen name="share/marketplace/index" />
        <Stack.Screen name="share/marketplace/configure" />
        <Stack.Screen name="share/marketplace/summary" />
        <Stack.Screen name="share/marketplace/options" />
        <Stack.Screen name="share/marketplace/history" />
        <Stack.Screen name="data/index" />
        <Stack.Screen name="data/export" />
        <Stack.Screen name="data/import" />
      </Stack>
      <VehicleDashboardModals />
    </VehicleDashboardProvider>
  );
}
