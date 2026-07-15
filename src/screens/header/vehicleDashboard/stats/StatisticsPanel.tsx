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

export function StatisticsPanel(props: StatisticsPanelProps) {
  const panelProps = useStatisticsPanel(props);

  return <StatisticsPanelContent key={props.period} {...panelProps} />;
}
