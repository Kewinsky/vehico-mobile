import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { supabase } from "../services/supabase/client";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AppStackParamList, "Auth">;

export function AuthScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

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
        // Check for rate limit error
        if (
          error.message.includes("rate limit") ||
          error.message.includes("Rate limit")
        ) {
          toastError(t("auth.rateLimitExceeded"));
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

    toastSuccess(t("auth.signedInSuccessfully"));
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
      toastSuccess(t("auth.signedInSuccessfully"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show magic link sent confirmation
  if (magicLinkSent) {
    return (
      <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
        <View style={styles.magicLinkContainer}>
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: theme.colors.accent }]}>
              ✉️
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("auth.magicLinkSentTitle")}
            </Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>
              {t("auth.magicLinkSentBody", { email: sentEmail })}
            </Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {t("auth.magicLinkSentHint")}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              variant="ghost"
              onPress={() => {
                setMagicLinkSent(false);
                setEmail("");
                setSentEmail("");
              }}
            >
              {t("auth.sendAnotherLink")}
            </Button>
          </View>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.sm + 2 }} />
      <View style={styles.container}>
        {/* Magic Link Section */}
        <View style={styles.magicLinkSection}>
          <TextField
            noMarginTop
            label={`${t("auth.emailLabel")} *`}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("auth.emailPlaceholder")}
            editable={!isSubmitting && !isSocialLoading}
          />

          <View style={styles.actions}>
            <Button onPress={sendMagicLink} disabled={!canSubmit}>
              {isSubmitting ? t("auth.sendingLink") : t("auth.sendMagicLink")}
            </Button>

            {/* TEMPORARY: Test account button */}
            <View style={{ height: theme.spacing.sm }} />
            <Button
              onPress={signInWithTestAccount}
              disabled={isSubmitting}
              variant="ghost"
            >
              {isSubmitting
                ? t("common.loading")
                : "🧪 Test Account (test@user.com)"}
            </Button>
          </View>

          <Text style={[styles.magicLinkHint, { color: theme.colors.muted }]}>
            {t("auth.magicLinkHint")}
          </Text>
        </View>

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
                  opacity: isSocialLoading === "facebook" || pressed ? 0.7 : 1,
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
              <Ionicons name="logo-google" size={20} color={theme.colors.fg} />
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
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.muted }]}>
            {t("auth.bySigningIn")}{" "}
            <Text
              style={[styles.footerLink, { color: theme.colors.accent }]}
              onPress={() => navigation.navigate("TermsOfUse")}
            >
              {t("auth.termsOfService")}
            </Text>{" "}
            {t("common.and")}{" "}
            <Text
              style={[styles.footerLink, { color: theme.colors.accent }]}
              onPress={() => navigation.navigate("PrivacyPolicy")}
            >
              {t("auth.privacyPolicy")}
            </Text>
            .
          </Text>
        </View>
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.md,
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
      height: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
    },
    socialButtonText: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
    magicLinkSection: {
      gap: theme.spacing.sm,
    },
    actions: {
      paddingTop: theme.spacing.xs,
    },
    magicLinkHint: {
      fontSize: theme.typography.small,
      textAlign: "center",
    },
    footer: {
      paddingTop: theme.spacing.md,
    },
    footerText: {
      fontSize: theme.typography.small,
      textAlign: "center",
      lineHeight: 18,
    },
    footerLink: {
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    magicLinkContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: 64,
    },
    content: {
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      width: "100%",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
    },
    body: {
      fontSize: theme.typography.body,
      textAlign: "center",
      lineHeight: 22,
    },
    hint: {
      fontSize: theme.typography.small,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      lineHeight: 18,
    },
  });
