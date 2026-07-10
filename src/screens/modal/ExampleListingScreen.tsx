import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";

export function ExampleListingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <ModalLayout
      title={t("shop.exampleListingPage.title")}
      cancel={{ onPress: () => router.back(), label: t("common.cancel") }}
      useNativeHeaderScrollView
    >
      <View style={styles.container}>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t("shop.exampleListingPage.subtitle")}
        </Text>
        <View style={[styles.bodyWrap]}>
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
    subtitle: {
      fontSize: theme.typography.body,
      marginBottom: theme.spacing.md,
    },
    bodyWrap: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    body: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
    bottomSpacer: {
      height: theme.spacing.xl,
    },
  });
