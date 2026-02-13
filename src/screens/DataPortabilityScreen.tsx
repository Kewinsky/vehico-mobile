import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "DataPortability">;

export function DataPortabilityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const tiles = useMemo(
    () => [
      {
        key: "export",
        title: t("dataPortability.exportButton"),
        icon: "share" as const,
        onPress: () => navigation.navigate("Export", { vehicleId }),
      },
      {
        key: "import",
        title: t("dataPortability.importButton"),
        icon: "download" as const,
        onPress: () => navigation.navigate("Import", { vehicleId }),
      },
    ],
    [t, navigation, vehicleId]
  );

  return (
    <Screen padding={false} header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }>
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("dataPortability.title")}</Text>
        </View>
      </View>
      <View style={styles.list}>
        <View style={styles.row}>
          {tiles.map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={32}
                color={theme.colors.accent}
              />
              <Text style={styles.tileTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    list: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      gap: theme.spacing.xs,
    },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    tile: {
      flex: 1,
      minHeight: 130,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      fontWeight: "800",
      textAlign: "center",
    },
  });
