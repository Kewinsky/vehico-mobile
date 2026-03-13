import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "ExampleListing">;

export function ExampleListingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <ModalLayout
      title={t("shop.exampleListingPage.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      useNativeHeaderScrollView
    >
      <View style={styles.container}>
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
      </View>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    largeTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
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
