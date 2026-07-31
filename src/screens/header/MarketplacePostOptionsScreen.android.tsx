import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { resolveMarketplacePostContent } from "../../services/marketplace/marketplaceRepo";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { toastSuccess, toastCaughtError } from "../../ui/toast/toast";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "MarketplacePostOptions"
>;

/**
 * Android: read-only TextInput nested in ScrollView does not receive pan gestures.
 * Use an inner ScrollView + Text so content scrolls natively.
 */
export function MarketplacePostOptionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { content, vehicleId, postTitle, generatedAt } = route.params;
  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl",
  );

  const displayContent = useMemo(
    () => resolveMarketplacePostContent(content, displayLang),
    [content, displayLang],
  );

  const handleBack = () => {
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
      toastCaughtError(e, t("common.error"));
    }
  }

  const layoutTitle = postTitle
    ? t("marketplace.postWithTitle", { title: postTitle })
    : t("marketplace.postGenerated");

  return (
    <HeaderLayout onBack={handleBack}>
      <NativeHeaderScrollView nestedScrollEnabled>
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
          <ScrollView
            key={displayLang}
            nestedScrollEnabled
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            showsVerticalScrollIndicator
          >
            <Text
              selectable
              style={[styles.contentText, { color: theme.colors.fg }]}
            >
              {displayContent}
            </Text>
          </ScrollView>
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
      height: 400,
      overflow: "hidden",
    },
    contentScroll: {
      flex: 1,
    },
    contentScrollInner: {
      padding: theme.spacing.md,
    },
    contentText: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
    },
  });
