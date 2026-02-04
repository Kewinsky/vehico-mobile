import { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/ThemeProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Landing">;

export function LandingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo/Title Section */}
          <View style={styles.header}>
            <Text style={[styles.logo, { color: theme.colors.accent }]}>
              🚗
            </Text>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("landing.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("landing.subtitle")}
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.features}>
            <FeatureItem
              icon="📋"
              title={t("landing.feature1Title")}
              description={t("landing.feature1Description")}
              theme={theme}
            />
            <FeatureItem
              icon="⛽"
              title={t("landing.feature2Title")}
              description={t("landing.feature2Description")}
              theme={theme}
            />
            <FeatureItem
              icon="📅"
              title={t("landing.feature3Title")}
              description={t("landing.feature3Description")}
              theme={theme}
            />
            <FeatureItem
              icon="📊"
              title={t("landing.feature4Title")}
              description={t("landing.feature4Description")}
              theme={theme}
            />
          </View>
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <Button onPress={() => navigation.navigate("Auth")}>
          {t("landing.getStarted")}
        </Button>
      </View>
    </View>
  );
}

function FeatureItem({
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
    <View style={styles.item}>
      <Text style={styles.icon}>{icon}</Text>
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
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    header: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    logo: {
      fontSize: theme.spacing.xl * 2,
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.body,
      textAlign: "center",
      lineHeight: theme.typography.body + 6,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    features: {
      gap: theme.spacing.lg,
      marginTop: theme.spacing.xl,
    },
    footer: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
  });

const makeFeatureStyles = (theme: any) =>
  StyleSheet.create({
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
    },
    icon: {
      fontSize: theme.typography.largeTitle,
      width: 48,
      textAlign: "center",
    },
    textContainer: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.xs / 2,
    },
    description: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
  });
