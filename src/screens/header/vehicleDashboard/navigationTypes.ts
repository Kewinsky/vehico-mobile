export type VehicleDashboardTabParamList = {
  Menu: { vehicleId: string };
  Overview: { vehicleId: string };
  Stats: { vehicleId: string };
};

export type VehicleDashboardTabName = keyof VehicleDashboardTabParamList;
