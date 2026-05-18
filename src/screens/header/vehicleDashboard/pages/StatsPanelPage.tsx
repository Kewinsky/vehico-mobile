import { StyleSheet, View } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";
import { StatisticsScreen } from "../../StatisticsScreen";

type StatsPanelPageProps = {
  windowWidth: number;
  vehicleId: string;
};

export function StatsPanelPage({ windowWidth, vehicleId }: StatsPanelPageProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={[styles.page, { width: windowWidth }]}>
      <StatisticsScreen embedded vehicleId={vehicleId} />
    </View>
  );
}

const makeStyles = (theme: {
  layout: { contentPaddingHorizontal: number };
  spacing: { md: number };
}) =>
  StyleSheet.create({
    page: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
  });
