import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastInfo } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "Share">;

export function ShareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { title } = route.params;

  function notAvailable() {
    toastInfo(t("share.notAvailableTitle"), t("share.notAvailableBody"));
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <Text style={styles.h1}>{t("share.title")}</Text>
        <Text style={styles.subtitle}>
          {t("share.subtitle", { vehicleTitle: title })}
        </Text>

        <View style={{ height: 16 }} />
        <Button onPress={notAvailable} variant="ghost">
          {t("share.pdfReport")}
        </Button>
        <View style={{ height: 10 }} />
        <Button onPress={notAvailable} variant="ghost">
          {t("share.onlineReport")}
        </Button>
        <View style={{ height: 10 }} />
        <Button onPress={notAvailable} variant="ghost">
          {t("share.marketplacePost")}
        </Button>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      marginTop: 8,
      color: theme.colors.muted,
      lineHeight: 22,
    },
  });
