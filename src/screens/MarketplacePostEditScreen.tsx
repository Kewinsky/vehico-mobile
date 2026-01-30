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
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

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
      toastError(e?.message ?? t("common.error"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (!content.trim()) {
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
    <Screen padding={false}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => {
              if (!saving && content.trim()) {
                void handleSave();
              }
            }}
            disabled={saving || !content.trim()}
            hitSlop={10}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                opacity: !content.trim() || saving ? 0.5 : pressed ? 0.6 : 1,
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
      fontSize: theme.typography.title,
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
      fontSize: theme.typography.small,
      fontFamily: "monospace",
      lineHeight: theme.typography.body + 4,
    },
  });
