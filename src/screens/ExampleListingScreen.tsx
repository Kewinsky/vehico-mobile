import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleListing">;

export function ExampleListingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <ScreenLayout
        title={t("shop.exampleListingPage.title")}
        scrollable
        contentContainerStyle={styles.contentWrap}
      >
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t("shop.exampleListingPage.subtitle")}
        </Text>
        <View
          style={[
            styles.bodyWrap,
            {
              backgroundColor: theme.colors.border + "40",
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[styles.body, { color: theme.colors.fg }]}
            selectable={false}
          >
            {t("shop.exampleListingPage.body")}
          </Text>
        </View>
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    contentWrap: {
      gap: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 6,
    },
    bodyWrap: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
    },
    body: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body,
    },
  });
