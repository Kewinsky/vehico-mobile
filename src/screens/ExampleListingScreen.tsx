import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleListing">;

export function ExampleListingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen
      padding={false}
      header={<AppHeader onBack={() => navigation.goBack()} />}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
      >
        <Text style={[styles.largeTitle, { color: theme.colors.fg }]}>
          {t("shop.exampleListingPage.title")}
        </Text>
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
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingBottom: theme.spacing.xl,
    },
    largeTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      marginVertical: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 6,
      marginBottom: theme.spacing.md,
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
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
