import { StyleSheet, Text, View, ScrollView, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { DashboardStackParamList } from "../app/navigation/types";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { resolveMarketplacePostContent } from "../services/marketplace/marketplaceRepo";
import { ChoiceChip } from "../ui/components/ChoiceChip";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastSuccess, toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<
  DashboardStackParamList,
  "MarketplacePostOptions"
>;

export function MarketplacePostOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { content, vehicleTitle, vehicleId, postTitle } = route.params;
  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl"
  );

  const displayContent = useMemo(
    () => resolveMarketplacePostContent(content, displayLang),
    [content, displayLang]
  );

  const handleBack = () => {
    // Try to go back first, if not possible, replace with Marketplace screen
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Marketplace", { vehicleId });
    }
  };

  async function handleCopyContent() {
    try {
      await Clipboard.setStringAsync(displayContent);
      toastSuccess(t("marketplace.copiedToClipboard"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={handleBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>
            {postTitle
              ? t("marketplace.postWithTitle", { title: postTitle })
              : t("marketplace.postGenerated")}
          </Text>
          <Text style={styles.subtitle}>
            {t("marketplace.postGeneratedSubtitle", { vehicleTitle })}
          </Text>
        </View>

        <View style={styles.langRow}>
          <View style={styles.langCol}>
            <ChoiceChip
              label={t("marketplace.languagePl")}
              selected={displayLang === "pl"}
              onPress={() => setDisplayLang("pl")}
            />
          </View>
          <View style={styles.langCol}>
            <ChoiceChip
              label={t("marketplace.languageEn")}
              selected={displayLang === "en"}
              onPress={() => setDisplayLang("en")}
            />
          </View>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.contentContainer}>
          <TextInput
            key={displayLang}
            style={[styles.contentText, { color: theme.colors.fg }]}
            value={displayContent}
            multiline
            textAlignVertical="top"
            editable={false}
            scrollEnabled={true}
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
          />
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Button onPress={handleCopyContent}>
          {t("marketplace.copyToClipboard")}
        </Button>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      gap: theme.spacing.xs / 2,
    },
    h1: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.muted,
    },
    langRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    langCol: {
      flex: 1,
    },
    contentContainer: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      minHeight: 300,
      maxHeight: 500,
      padding: theme.spacing.sm,
    },
    contentText: {
      flex: 1,
      fontSize: theme.typography.small,
      fontFamily: "monospace",
      lineHeight: theme.typography.body + 4,
    },
  });
