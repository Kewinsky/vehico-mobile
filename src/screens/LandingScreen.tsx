import { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { Button } from "../ui/components/Button";
import { LegalLinksRow } from "../ui/components/LegalLinksRow";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Landing">;

export function LandingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen
      padding={false}
      footer={
        <>
          <Button onPress={() => navigation.navigate("Auth")}>
            {t("landing.getStarted")}
          </Button>
          <LegalLinksRow
            onPressTerms={() => navigation.navigate("TermsOfUse")}
            onPressPrivacy={() => navigation.navigate("PrivacyPolicy")}
          />
        </>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("landing.title")}
          </Text>
          <Text style={[styles.heroLead, { color: theme.colors.muted }]}>
            {t("landing.heroLead")}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("landing.featuresSectionTitle")}
          </Text>
          <View style={styles.featuresList}>
            <FeatureRow
              icon="📋"
              title={t("landing.feature1Title")}
              description={t("landing.feature1Description")}
              theme={theme}
            />
            <FeatureRow
              icon="⛽"
              title={t("landing.feature2Title")}
              description={t("landing.feature2Description")}
              theme={theme}
            />
            <FeatureRow
              icon="📅"
              title={t("landing.feature3Title")}
              description={t("landing.feature3Description")}
              theme={theme}
            />
            <FeatureRow
              icon="📊"
              title={t("landing.feature4Title")}
              description={t("landing.feature4Description")}
              theme={theme}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  theme,
}: {
  icon: string;
  title: string;
  description: string;
  theme: any;
}) {
  const styles = useMemo(() => makeFeatureStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.muted }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    hero: {
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    logo: {
      width: 100,
      height: 100,
    },
    title: {
      fontSize: theme.typography.largeTitle + 4,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.5,
      textAlign: "center",
    },
    heroLead: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
      textAlign: "center",
      maxWidth: 320,
    },
    section: {
      gap: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    featuresList: {
      gap: theme.spacing.sm,
    },
  });

const makeFeatureStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      fontSize: 22,
    },
    textContainer: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
  });
