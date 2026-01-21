import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "DataPortability">;

export function DataPortabilityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId, title } = route.params;

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.h1}>{t("dataPortability.title")}</Text>
          <Text style={styles.subtitle}>{t("dataPortability.subtitle")}</Text>
        </View>
      </View>
      <View style={styles.wrap}>
        <Button
          onPress={() => navigation.navigate("Export", { vehicleId, title })}
          variant="ghost"
        >
          {t("dataPortability.exportButton")}
        </Button>
        <View style={{ height: 10 }} />
        <Button
          onPress={() => navigation.navigate("Import", { vehicleId, title })}
          variant="ghost"
        >
          {t("dataPortability.importButton")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    wrap: {
      paddingHorizontal: theme.spacing.md,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.muted,
    },
  });
