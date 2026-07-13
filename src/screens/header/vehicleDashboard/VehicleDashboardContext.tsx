import { createContext, useContext, type ReactNode } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../../app/navigation/RootNavigator";
import { useVehicleDashboardState } from "./useVehicleDashboardState";

type VehicleDashboardContextValue = ReturnType<typeof useVehicleDashboardState>;

const VehicleDashboardContext =
  createContext<VehicleDashboardContextValue | null>(null);

type VehicleDashboardProviderProps = {
  vehicleId: string;
  navigation: NativeStackNavigationProp<AppStackParamList>;
  children: ReactNode;
};

export function VehicleDashboardProvider({
  vehicleId,
  navigation,
  children,
}: VehicleDashboardProviderProps) {
  const value = useVehicleDashboardState({ vehicleId, navigation });

  return (
    <VehicleDashboardContext.Provider value={value}>
      {children}
    </VehicleDashboardContext.Provider>
  );
}

export function useVehicleDashboard() {
  const context = useContext(VehicleDashboardContext);
  if (!context) {
    throw new Error(
      "useVehicleDashboard must be used within VehicleDashboardProvider",
    );
  }
  return context;
}
