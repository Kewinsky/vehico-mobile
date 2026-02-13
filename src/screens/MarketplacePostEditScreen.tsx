import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  getMarketplacePost,
  updateMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { ChoiceChip } from "../ui/components/ChoiceChip";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplacePostEdit">;

export function MarketplacePostEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { postId } = route.params;

  const [content, setContent] = useState<{ pl: string; en: string }>({
    pl: "",
    en: "",
  });
  const [displayLang, setDisplayLang] = useState<"pl" | "en">(
    (settings?.language as "pl" | "en") ?? "pl"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasContent = !!(content.pl?.trim() || content.en?.trim());

  useEffect(() => {
    void loadPost();
  }, [postId]);

  async function loadPost() {
    try {
      setLoading(true);
      const post = await getMarketplacePost(postId);
      setContent(post.content);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (!hasContent) {
        toastError(t("marketplace.noContentToSave"));
        return;
      }

      setSaving(true);
      await updateMarketplacePost(postId, content);
      toastSuccess(t("marketplace.updated"));
      navigation.goBack();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      padding={false}
      header={
        <AppHeader
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
          right={
            <Pressable
              onPress={() => {
                if (!saving && hasContent) {
                  void handleSave();
                }
              }}
              disabled={saving || !hasContent}
              hitSlop={10}
              style={({ pressed }) => [
                {
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !hasContent || saving ? 0.5 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name="save-outline"
                size={24}
                color={theme.colors.accent}
              />
            </Pressable>
          }
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingIndicator />
            </View>
          ) : (
            <>
              <Text style={styles.h1}>{t("marketplace.editPost")}</Text>
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

              <View
                style={[
                  styles.textAreaContainer,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <TextInput
                  key={displayLang}
                  style={[styles.textArea, { color: theme.colors.fg }]}
                  value={content[displayLang]}
                  onChangeText={(text) =>
                    setContent((prev) => ({ ...prev, [displayLang]: text }))
                  }
                  multiline
                  textAlignVertical="top"
                  placeholder={t("marketplace.contentPlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    h1: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      color: theme.colors.fg,
    },
    langRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    langCol: {
      flex: 1,
    },
    loadingContainer: {
      minHeight: 400,
      alignItems: "center",
      justifyContent: "center",
    },
    textAreaContainer: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      minHeight: 400,
      padding: theme.spacing.sm,
    },
    textArea: {
      minHeight: 380,
      fontSize: theme.typography.small,
      fontFamily: "monospace",
      lineHeight: theme.typography.body + 4,
    },
  });
