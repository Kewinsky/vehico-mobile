import { StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import { routes } from "../../core/navigation/routes";
import { useUserSettings } from "../../core/providers/UserSettingsProvider";
import { resolveMarketplacePostContent } from "../../services/marketplace/marketplaceRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { toastSuccess, toastError } from "../../ui/toast/toast";

export function MarketplacePostOptionsScreen() {
  const params = useLocalSearchParams<{
    content: string;
    vehicleId: string;
    postTitle?: string;
    generatedAt?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const vehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;
  const postTitle = Array.isArray(params.postTitle) ? params.postTitle[0] : params.postTitle;
  const generatedAt = Array.isArray(params.generatedAt) ? params.generatedAt[0] : params.generatedAt;
  const content = useMemo(() => {
    const raw = Array.isArray(params.content) ? params.content[0] : params.content;
    try {
      return JSON.parse(raw ?? "") as { pl: string; en: string };
    } catch {
      return { pl: "", en: "" };
    }
  }, [params.content]);
  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl",
  );

  const displayContent = useMemo(
    () => resolveMarketplacePostContent(content, displayLang),
    [content, displayLang],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (vehicleId) {
      router.replace(routes.marketplace(vehicleId));
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
    <HeaderLayout onBack={handleBack} showProfileAvatar>
      <NativeHeaderScrollView>
        <ContentHeader title={layoutTitle} subtitle={generatedAt} />
        <SegmentTabs<"pl" | "en">
          variant="secondary"
          value={displayLang}
          options={[
            { value: "pl", label: t("marketplace.languagePl") },
            { value: "en", label: t("marketplace.languageEn") },
          ]}
          onChange={(v) => setDisplayLang(v)}
        />

        <View style={{ height: theme.spacing.sm }} />

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

        <View style={{ height: theme.spacing.sm }} />

        <Button onPress={handleCopyContent}>
          {t("marketplace.copyToClipboard")}
        </Button>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    contentContainer: {
      borderRadius: theme.radius.xl,
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
