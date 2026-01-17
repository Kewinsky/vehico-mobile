import { ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { StatisticsCard } from "../ui/components/StatisticsCard";

type Props = NativeStackScreenProps<AppStackParamList, "Statistics">;

export function StatisticsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <Screen padding={false}>
      <AppHeader title={t("dashboard.stats.title")} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StatisticsCard vehicleId={route.params.vehicleId} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
  });

