import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../../../app/navigation/RootNavigator";
import type {
  FuelingEntry,
  ServiceEntry,
  Vehicle,
} from "../../../../types/domain";
import { StatisticsPanelContent } from "./StatisticsPanelContent";
import type { PeriodKey } from "./types";
import { useStatisticsPanel } from "./useStatisticsPanel";

type StatisticsPanelProps = {
  vehicleId: string;
  period: PeriodKey;
  vehicle: Vehicle | null;
  serviceEntries: ServiceEntry[];
  fuelingEntries: FuelingEntry[];
  navigation: NativeStackNavigationProp<AppStackParamList>;
};

export function StatisticsPanel({
  vehicleId,
  period,
  vehicle,
  serviceEntries,
  fuelingEntries,
  navigation,
}: StatisticsPanelProps) {
  const panelProps = useStatisticsPanel({
    vehicleId,
    period,
    vehicle,
    serviceEntries,
    fuelingEntries,
    navigation,
  });

  return <StatisticsPanelContent key={period} {...panelProps} />;
}
