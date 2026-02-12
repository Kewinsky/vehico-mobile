import { StyleSheet, Text, View, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();

  function onGeneratePress() {
    if (!isPremium) {
      Alert.alert(
        t("limits.premiumRequiredTitle"),
        t("limits.premiumRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("PublicReportConfigure", { vehicleId });
  }

  return (
    <Screen
      padding={false}
      header={<AppHeader onBack={() => navigation.goBack()} />}
    >
      <View style={styles.fixedHeader}>
        <Text style={styles.h1}>{t("publicReport.title")}</Text>
      </View>
      <View style={styles.content}>
        <Button onPress={onGeneratePress}>
          {t("publicReport.generateButton")}
        </Button>
        <View style={{ height: theme.spacing.xs }} />
        <Button
          onPress={() =>
            navigation.navigate("PublicReportHistory", {
              vehicleId,
            })
          }
          variant="ghost"
        >
          {t("publicReport.historyButton")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    content: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
  });
