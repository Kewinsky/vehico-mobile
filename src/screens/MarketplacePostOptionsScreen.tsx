import { StyleSheet, View, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { resolveMarketplacePostContent } from "../services/marketplace/marketplaceRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { ScreenLayout } from "../ui/components/ScreenLayout";
import { SegmentTabs } from "../ui/components/SegmentTabs";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastSuccess, toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "MarketplacePostOptions"
>;

export function MarketplacePostOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { content, vehicleId, postTitle } = route.params;
  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl",
  );

  const displayContent = useMemo(
    () => resolveMarketplacePostContent(content, displayLang),
    [content, displayLang],
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

  const layoutTitle = postTitle
    ? t("marketplace.postWithTitle", { title: postTitle })
    : t("marketplace.postGenerated");

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={handleBack}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <ScreenLayout
        title={layoutTitle}
        scrollable={true}
        contentContainerStyle={styles.scrollContent}
      >
        <SegmentTabs<"pl" | "en">
          value={displayLang}
          options={[
            { value: "pl", label: t("marketplace.languagePl") },
            { value: "en", label: t("marketplace.languageEn") },
          ]}
          onChange={(v) => setDisplayLang(v)}
        />

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
      </ScreenLayout>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: theme.spacing.xl,
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
      lineHeight: theme.typography.body + 4,
    },
  });
