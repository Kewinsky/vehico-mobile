import { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { i18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<AppStackParamList, "PrivacyPolicy">;

export function PrivacyPolicyScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const formatDate = () => {
    const date = new Date();
    const locale = i18n.language === "pl" ? "pl-PL" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("privacy.title")}
            </Text>
            <Text style={[styles.lastUpdated, { color: theme.colors.muted }]}>
              {t("privacy.lastUpdated")}: {formatDate()}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section1Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section1Content")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section2Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section2Content")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section3Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section3Content")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section4Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section4Content")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section5Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section5Content")}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t("privacy.section6Title")}
            </Text>
            <Text style={[styles.text, { color: theme.colors.muted }]}>
              {t("privacy.section6Content")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xs,
      gap: theme.spacing.lg,
    },
    titleContainer: {
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.title * 1.4,
      fontWeight: "700",
    },
    lastUpdated: {
      fontSize: theme.typography.small,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: "700",
      marginTop: theme.spacing.md,
    },
    text: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
    },
  });
