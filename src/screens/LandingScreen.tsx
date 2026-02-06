import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { Button } from "../ui/components/Button";
import { Card } from "../ui/components/Card";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Landing">;

const logoLight = require("../../assets/icon-light.png");
const logoDark = require("../../assets/icon-dark.png");

export function LandingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const logo = mode === "dark" ? logoDark : logoLight;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("landing.title")}
          </Text>
          <Text style={[styles.heroLead, { color: theme.colors.muted }]}>
            {t("landing.heroLead")}
          </Text>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("landing.howTitle")}
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.muted }]}>
            {t("landing.howDesc")}
          </Text>
          <View style={styles.steps}>
            <StepCard
              index="01"
              title={t("landing.step1Title")}
              desc={t("landing.step1Desc")}
              theme={theme}
            />
            <StepCard
              index="02"
              title={t("landing.step2Title")}
              desc={t("landing.step2Desc")}
              theme={theme}
            />
            <StepCard
              index="03"
              title={t("landing.step3Title")}
              desc={t("landing.step3Desc")}
              theme={theme}
            />
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("landing.featuresSectionTitle")}
          </Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.muted }]}>
            {t("landing.featuresSectionDesc")}
          </Text>
          <View style={styles.features}>
            <FeatureCard
              icon="📋"
              title={t("landing.feature1Title")}
              description={t("landing.feature1Description")}
              theme={theme}
            />
            <FeatureCard
              icon="⛽"
              title={t("landing.feature2Title")}
              description={t("landing.feature2Description")}
              theme={theme}
            />
            <FeatureCard
              icon="📅"
              title={t("landing.feature3Title")}
              description={t("landing.feature3Description")}
              theme={theme}
            />
            <FeatureCard
              icon="📊"
              title={t("landing.feature4Title")}
              description={t("landing.feature4Description")}
              theme={theme}
            />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Button onPress={() => navigation.navigate("Auth")}>
            {t("landing.getStarted")}
          </Button>
          <View style={styles.legalRow}>
            <Pressable
              onPress={() => navigation.navigate("TermsOfUse")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.legalLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.legalText, { color: theme.colors.muted }]}>
                {t("landing.terms")}
              </Text>
            </Pressable>
            <Text style={[styles.legalSeparator, { color: theme.colors.muted }]}>
              ·
            </Text>
            <Pressable
              onPress={() => navigation.navigate("PrivacyPolicy")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.legalLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.legalText, { color: theme.colors.muted }]}>
                {t("landing.privacy")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StepCard({
  index,
  title,
  desc,
  theme,
}: {
  index: string;
  title: string;
  desc: string;
  theme: any;
}) {
  const styles = useMemo(() => makeStepStyles(theme), [theme]);
  return (
    <Card style={styles.card}>
      <View style={styles.inner}>
        <View
          style={[
            styles.circle,
            {
              borderColor: theme.colors.accent,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text style={[styles.circleText, { color: theme.colors.accent }]}>
            {index}
          </Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.stepTitle, { color: theme.colors.fg }]}>
            {title}
          </Text>
          <Text style={[styles.stepDesc, { color: theme.colors.muted }]}>
            {desc}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function FeatureCard({
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
    <Card style={styles.card}>
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
    </Card>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    scrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xl,
    },
    hero: {
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    logo: {
      width: 80,
      height: 80,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      letterSpacing: -0.5,
      textAlign: "center",
    },
    heroLead: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 6,
      textAlign: "center",
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: "700",
    },
    sectionDesc: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
    steps: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    features: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    footer: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    legalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    legalLink: {},
    legalText: {
      fontSize: theme.typography.xs,
      fontWeight: "600",
    },
    legalSeparator: {
      fontSize: theme.typography.xs,
    },
  });

const makeStepStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.md,
    },
    inner: {
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    circleText: {
      fontSize: theme.typography.small,
      fontWeight: "700",
    },
    textWrap: {
      alignItems: "center",
      gap: theme.spacing.xs / 2,
    },
    stepTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      textAlign: "center",
    },
    stepDesc: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      textAlign: "center",
    },
  });

const makeFeatureStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.md,
    },
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
      fontWeight: "700",
    },
    description: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
  });
