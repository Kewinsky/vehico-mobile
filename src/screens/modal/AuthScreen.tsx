import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { supabase } from "../../services/supabase/client";
import { Button } from "../../ui/components/common/Button";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { ENV } from "../../config/env";
import { Card, CardRow } from "../../ui/components/common/Card";

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AppStackParamList, "Auth">;

export function AuthScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [magicLinkError, setMagicLinkError] = useState<null | "expired">(null);

  useEffect(() => {
    const parseMagicLinkError = (url: string): null | "expired" => {
      // Supabase usually puts tokens + errors in the URL fragment after '#'.
      const hashIndex = url.indexOf("#");
      const fragment = hashIndex >= 0 ? url.substring(hashIndex + 1) : "";
      const queryIndex = url.indexOf("?");
      const query = queryIndex >= 0 ? url.substring(queryIndex + 1) : "";

      const params = new URLSearchParams(fragment || query);

      const error = params.get("error") ?? "";
      const errorCode = params.get("error_code") ?? "";
      const errorDesc = params.get("error_description") ?? "";
      const haystack = `${error} ${errorCode} ${errorDesc}`.toLowerCase();

      if (!haystack) return null;
      if (haystack.includes("expired")) return "expired";
      if (haystack.includes("invalid") && haystack.includes("token"))
        return "expired";
      return "expired";
    };

    const handle = (url: string | null) => {
      if (!url || !url.includes("auth/magic-link")) return;
      const nextError = parseMagicLinkError(url);
      if (nextError) setMagicLinkError(nextError);
    };

    void Linking.getInitialURL().then((url) => handle(url));
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  // Reset inputs when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setEmail("");
      setMagicLinkSent(false);
      setSentEmail("");
    }, []),
  );

  const emailTrimmed = useMemo(() => email.trim(), [email]);

  // Email validation regex
  const isValidEmail = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailTrimmed);
  }, [emailTrimmed]);

  const canSubmit = useMemo(
    () => emailTrimmed.length > 0 && isValidEmail && !isSubmitting,
    [emailTrimmed, isValidEmail, isSubmitting],
  );

  async function sendMagicLink() {
    try {
      setIsSubmitting(true);

      // Use makeRedirectUri() which automatically handles Expo Go (exp://) and production (vehico://)
      const emailRedirectTo = AuthSession.makeRedirectUri({
        path: "auth/magic-link",
      });

      // Always allow user creation - Supabase will handle existing users automatically
      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrimmed,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) {
        // Check for rate limit error (Supabase 429 / "too many" / "rate limit")
        const msg = error.message?.toLowerCase() ?? "";
        if (
          msg.includes("rate limit") ||
          msg.includes("too many") ||
          msg.includes("429") ||
          msg.includes("email rate limit")
        ) {
          toastError(
            `${t("auth.rateLimitExceeded")}. ${t("auth.rateLimitMessage")}`,
          );
          return;
        }
        throw error;
      }

      // Magic link sent successfully
      setMagicLinkSent(true);
      setSentEmail(emailTrimmed);
      setEmail("");
      toastSuccess(t("auth.magicLinkSent"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuthCallback(callbackUrl: string) {
    const hashIndex = callbackUrl.indexOf("#");
    if (hashIndex === -1) {
      throw new Error("No hash fragment in callback URL");
    }

    const hash = callbackUrl.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      throw new Error("Missing tokens in callback URL");
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) throw sessionError;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Session was not created");
    }
  }

  async function signInWithOAuth(provider: "google" | "facebook") {
    try {
      setIsSocialLoading(provider);

      const redirectTo = AuthSession.makeRedirectUri({
        path: "auth/callback",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === "google" && {
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          }),
        },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error("No OAuth URL received");
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type === "success") {
        const callbackUrl = "url" in result ? result.url : null;
        if (callbackUrl) {
          await handleOAuthCallback(callbackUrl);
        } else {
          throw new Error("No callback URL in result");
        }
      } else if (result.type !== "cancel") {
        throw new Error("Authentication failed");
      }
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSocialLoading(null);
    }
  }

  async function signInWithGoogle() {
    return signInWithOAuth("google");
  }

  async function signInWithFacebook() {
    return signInWithOAuth("facebook");
  }

  async function signInWithTestAccount() {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: "test@user.com",
        password: "testuser",
      });

      if (error) throw error;
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (magicLinkError === "expired") {
    return (
      <ModalLayout>
        <FormScreen noLayout scrollEnabled={false}>
          <View style={styles.magicLinkContainer}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="time-outline"
                size={56}
                color={theme.colors.accent}
              />
            </View>

            <View style={styles.content}>
              <Text style={[styles.title, { color: theme.colors.fg }]}>
                {t("auth.magicLinkExpiredTitle")}
              </Text>
              <Text style={[styles.body, { color: theme.colors.muted }]}>
                {t("auth.magicLinkExpiredBody")}
              </Text>
            </View>

            <Button
              style={styles.magicLinkButton}
              onPress={() => {
                setMagicLinkError(null);
                navigation.goBack();
              }}
            >
              {t("common.back")}
            </Button>
          </View>
        </FormScreen>
      </ModalLayout>
    );
  }

  // Show magic link sent confirmation
  if (magicLinkSent) {
    const email = sentEmail.trim();
    const magicLinkBody = t("auth.magicLinkSentBody", { email });
    const emailIdx = email.length ? magicLinkBody.indexOf(email) : -1;

    return (
      <ModalLayout
        cancel={{
          onPress: () => navigation.goBack(),
          label: t("common.cancel"),
        }}
      >
        <FormScreen noLayout scrollEnabled={false}>
          <View style={styles.magicLinkContainer}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="mail-outline"
                size={56}
                color={theme.colors.accent}
              />
            </View>

            <View style={styles.content}>
              <Text style={[styles.title, { color: theme.colors.fg }]}>
                {t("auth.magicLinkSentTitle")}
              </Text>

              <Text style={[styles.body, { color: theme.colors.muted }]}>
                {emailIdx >= 0 ? (
                  <>
                    {magicLinkBody.slice(0, emailIdx)}
                    <Text style={styles.bodyEmail}>{email}</Text>
                    {magicLinkBody.slice(emailIdx + email.length)}
                  </>
                ) : (
                  magicLinkBody
                )}
              </Text>
            </View>

            <Button
              style={styles.magicLinkButton}
              onPress={() => {
                setMagicLinkSent(false);
                setEmail("");
                setSentEmail("");
              }}
            >
              {t("auth.sendAnotherLink")}
            </Button>
          </View>
        </FormScreen>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout
      title={t("auth.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView>
          {/* Magic Link Section */}
          <View
            style={[styles.magicLinkSection, { marginTop: theme.spacing.md }]}
          >
            <Card>
              <CardRow>
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("auth.emailLabel")}
                  </Text>
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isSubmitting && !isSocialLoading}
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </CardRow>
            </Card>

            <Button onPress={sendMagicLink} disabled={!canSubmit}>
              {isSubmitting ? t("auth.sendingLink") : t("auth.sendMagicLink")}
            </Button>
          </View>

          <Text style={[styles.magicLinkHint, { color: theme.colors.muted }]}>
            {t("auth.magicLinkHint")}
          </Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <Text style={[styles.dividerText, { color: theme.colors.muted }]}>
              {t("auth.orContinueWith")}
            </Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: theme.colors.border },
              ]}
            />
          </View>

          {/* Social Auth Section */}
          <View style={styles.socialSection}>
            <View style={styles.socialButtons}>
              <Pressable
                onPress={signInWithFacebook}
                disabled={!!isSocialLoading}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity:
                      isSocialLoading === "facebook" || pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="logo-facebook"
                  size={20}
                  color={theme.colors.fg}
                />
                <Text
                  style={[styles.socialButtonText, { color: theme.colors.fg }]}
                >
                  {isSocialLoading === "facebook"
                    ? t("common.loading")
                    : t("auth.facebook")}
                </Text>
              </Pressable>
              <Pressable
                onPress={signInWithGoogle}
                disabled={!!isSocialLoading}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: isSocialLoading === "google" || pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={theme.colors.fg}
                />
                <Text
                  style={[styles.socialButtonText, { color: theme.colors.fg }]}
                >
                  {isSocialLoading === "google"
                    ? t("common.loading")
                    : t("auth.google")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Terms & Privacy Footer */}
          <View style={[styles.footer]}>
            <Text style={[styles.footerText, { color: theme.colors.muted }]}>
              {t("auth.bySigningIn")}
              {"\n"}
              <Text
                style={[styles.footerLink, { color: theme.colors.accent }]}
                onPress={() =>
                  void WebBrowser.openBrowserAsync(`${ENV.WEB_APP_URL}/terms`)
                }
              >
                {t("auth.termsOfService")}
              </Text>{" "}
              {t("common.and")}{" "}
              <Text
                style={[styles.footerLink, { color: theme.colors.accent }]}
                onPress={() =>
                  void WebBrowser.openBrowserAsync(`${ENV.WEB_APP_URL}/privacy`)
                }
              >
                {t("auth.privacyPolicy")}
              </Text>
            </Text>
          </View>
          {/* Test account — only in development */}
          {ENV.APP_ENV === "development" && (
            <Button
              onPress={signInWithTestAccount}
              disabled={isSubmitting}
              variant="ghost"
            >
              {isSubmitting
                ? t("common.loading")
                : "🧪 Test Account (test@user.com)"}
            </Button>
          )}
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    authTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      marginVertical: theme.spacing.md,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
      textAlign: "right",
    },
    socialSection: {
      gap: theme.spacing.sm,
    },
    socialButtons: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    socialButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      height: theme.spacing.lg * 2,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    socialButtonText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    magicLinkSection: {
      gap: theme.spacing.sm,
    },
    magicLinkHint: {
      fontSize: theme.typography.small,
      textAlign: "center",
      marginTop: theme.spacing.sm,
    },
    footer: {
      paddingTop: theme.spacing.md,
    },
    footerText: {
      fontSize: theme.typography.small,
      textAlign: "center",
      lineHeight: theme.typography.body + 2,
    },
    footerLink: {
      textDecorationLine: "underline",
    },
    magicLinkContainer: {
      flex: 1,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: theme.spacing.xl * 2,
    },
    content: {
      alignItems: "center",
      gap: theme.spacing.md,
      width: "100%",
    },
    magicLinkButton: {
      marginTop: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    body: {
      fontSize: theme.typography.body,
      textAlign: "center",
      lineHeight: theme.typography.body + 6,
    },
    bodyEmail: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    hint: {
      fontSize: theme.typography.small,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      lineHeight: theme.typography.body + 2,
    },
  });
