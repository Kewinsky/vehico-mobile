import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDashboard">;

type Tile = {
  key: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId, title } = route.params;

  const tiles: Tile[] = [
    {
      key: "service",
      title: t("dashboard.tiles.serviceTitle"),
      subtitle: t("dashboard.tiles.serviceSubtitle"),
      onPress: () => navigation.navigate("VehicleDetail", { vehicleId, title }),
    },
    {
      key: "fuel",
      title: t("dashboard.tiles.fuelTitle"),
      subtitle: t("dashboard.tiles.fuelSubtitle"),
      onPress: () => navigation.navigate("FuelCosts", { vehicleId, title }),
    },
    {
      key: "docs",
      title: t("dashboard.tiles.docsTitle"),
      subtitle: t("dashboard.tiles.docsSubtitle"),
      onPress: () => navigation.navigate("Documents", { vehicleId, title }),
    },
    {
      key: "reminders",
      title: t("dashboard.tiles.remindersTitle"),
      subtitle: t("dashboard.tiles.remindersSubtitle"),
      onPress: () => navigation.navigate("Reminders", { vehicleId, title }),
    },
    {
      key: "share",
      title: t("dashboard.tiles.shareTitle"),
      subtitle: t("dashboard.tiles.shareSubtitle"),
      onPress: () => navigation.navigate("Share", { vehicleId, title }),
    },
    {
      key: "data",
      title: t("dashboard.tiles.dataTitle"),
      subtitle: t("dashboard.tiles.dataSubtitle"),
      onPress: () =>
        navigation.navigate("DataPortability", { vehicleId, title }),
    },
    {
      key: "manage",
      title: t("dashboard.tiles.manageTitle"),
      subtitle: t("dashboard.tiles.manageSubtitle"),
      onPress: () => navigation.navigate("ManageVehicle", { vehicleId, title }),
    },
  ];

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.header}>
        <Text style={styles.kicker}>{t("dashboard.kicker")}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <FlatList
        data={tiles}
        numColumns={2}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.tile,
              pressed && styles.tilePressed,
            ]}
          >
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={styles.tileSubtitle}>{item.subtitle}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      paddingTop: 16,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 16,
      gap: 6,
    },
    kicker: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.fg,
      fontSize: 22,
      fontWeight: "800",
    },
    grid: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: 12,
    },
    row: {
      gap: 12,
    },
    tile: {
      flex: 1,
      minHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 8,
      justifyContent: "space-between",
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: 16,
      fontWeight: "800",
    },
    tileSubtitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      lineHeight: 18,
    },
  });
