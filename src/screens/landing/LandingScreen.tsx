import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { ENV } from "../../config/env";
import { Button } from "../../ui/components/common/Button";
import { LegalLinksRow } from "../../ui/components/common/LegalLinksRow";
import { LandingLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { DecorativeBackground } from "../../ui/components/branding/DecorativeBackground";
import { BRAND_FONT_FAMILY } from "../../ui/components/branding/BrandHero";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { PremiumHero } from "../modal/ShopScreen";

type Props = NativeStackScreenProps<AppStackParamList, "Landing">;

export function LandingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <LandingLayout
      background={<DecorativeBackground variant="landing" />}
      stickyBottom={
        <View style={styles.stickyFooter}>
          <Button onPress={() => navigation.navigate("Auth")}>
            {t("landing.getStarted")}
          </Button>
          <LegalLinksRow
            termsUrl={`${ENV.WEB_APP_URL}/terms`}
            privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
          />
        </View>
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
        <View style={styles.heroShell}>
          <PremiumHero theme={theme} />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: theme.colors.fg }]}>
              {t("landing.title")}
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.muted }]}>
              {t("landing.heroLead")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t("landing.featuresSectionTitle")}
          </Text>
          <View style={styles.featuresList}>
            <FeatureCard
              icon="document-text-outline"
              title={t("landing.feature1Title")}
              description={t("landing.feature1Description")}
              theme={theme}
            />
            <FeatureCard
              icon="speedometer-outline"
              title={t("landing.feature2Title")}
              description={t("landing.feature2Description")}
              theme={theme}
            />
            <FeatureCard
              icon="calendar-outline"
              title={t("landing.feature3Title")}
              description={t("landing.feature3Description")}
              theme={theme}
            />
            <FeatureCard
              icon="stats-chart-outline"
              title={t("landing.feature4Title")}
              description={t("landing.feature4Description")}
              theme={theme}
            />
          </View>
        </View>
      </ScrollView>
    </LandingLayout>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  theme: any;
}) {
  const styles = useMemo(() => makeFeatureCardStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={35} color={theme.colors.accent} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
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
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    heroShell: {
      gap: theme.spacing.md,
      alignItems: "center",
    },
    heroCopy: {
      alignItems: "center",
      gap: theme.spacing.xs,
      width: "100%",
    },
    heroTitle: {
      fontSize: theme.typography.largeTitle + 6,
      fontWeight: "900",
      fontFamily: BRAND_FONT_FAMILY,
      textAlign: "center",
      letterSpacing: -0.7,
    },
    heroSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
      textAlign: "center",
      maxWidth: 360,
    },
    quickPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    section: {
      gap: theme.spacing.md,
    },
    stickyFooter: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    featuresList: {
      gap: theme.spacing.sm,
    },
  });

const makeFeatureCardStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md + 4,
      backgroundColor: hexToRgba(theme.colors.card, 0.86),
    },
    iconWrap: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    textContainer: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    description: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      color: theme.colors.muted,
    },
  });
