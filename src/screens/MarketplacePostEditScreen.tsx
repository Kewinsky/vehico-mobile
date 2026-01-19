import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import {
  getMarketplacePost,
  updateMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplacePostEdit">;

export function MarketplacePostEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { postId } = route.params;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadPost();
  }, [postId]);

  async function loadPost() {
    try {
      setLoading(true);
      const post = await getMarketplacePost(postId);
      setContent(post.content);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      if (!content.trim()) {
        toastError(t("common.error"), t("marketplace.noContentToCopy"));
        return;
      }
      await Clipboard.setStringAsync(content);
      toastSuccess(t("marketplace.copiedToClipboard"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  async function handleSave() {
    try {
      if (!content.trim()) {
        toastError(t("common.error"), t("marketplace.noContentToSave"));
        return;
      }

      setSaving(true);
      await updateMarketplacePost(postId, content);
      toastSuccess(t("marketplace.updated"));
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
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
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <>
              <Text style={styles.h1}>{t("marketplace.editPost")}</Text>
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
                  style={[styles.textArea, { color: theme.colors.fg }]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  placeholder={t("marketplace.contentPlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                />
              </View>

              <View style={{ height: theme.spacing.md }} />

              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <Button onPress={handleCopy} variant="ghost" disabled={saving}>
                    {t("marketplace.copyToClipboard")}
                  </Button>
                </View>
                <View style={{ width: theme.spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Button onPress={handleSave} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                </View>
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
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
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
      fontSize: 14,
      fontFamily: "monospace",
      lineHeight: 20,
    },
    actionsRow: {
      flexDirection: "row",
    },
  });
