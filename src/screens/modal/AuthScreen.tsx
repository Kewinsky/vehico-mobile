import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  EMAIL_OTP_LENGTH,
  isValidEmailOtpLength,
  normalizeEmailOtpInput,
} from "../../services/auth/emailOtp";
import { supabase } from "../../services/supabase/client";
import { Button } from "../../ui/components/common/Button";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { persistOAuthDisplayName } from "../../services/auth/signInProviders";
import { isAppStoreReviewEmail } from "../../config/appStoreReview";
import { ENV } from "../../config/env";
import { APP_DISPLAY_NAME } from "../../config/appBrand";
import { Card } from "../../ui/components/common/Card";
import { LegalLinksRow } from "../../ui/components/common/LegalLinksRow";
import { Logo } from "../../ui/components/branding/Logo";
import { BRAND_FONT_FAMILY } from "../../ui/components/branding/BrandHero";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AppStackParamList, "Auth">;

function isRateLimitError(message: string | undefined): boolean {
  const msg = message?.toLowerCase() ?? "";
  return (
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("429") ||
    msg.includes("email rate limit")
  );
}

function isOtpExpiredOrInvalid(message: string | undefined): boolean {
  const msg = message?.toLowerCase() ?? "";
  return (
    msg.includes("expired") ||
    msg.includes("invalid") ||
    msg.includes("otp") ||
    msg.includes("token")
  );
}

export function AuthScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setEmail("");
      setPassword("");
      setOtpCode("");
      setOtpSent(false);
      setSentEmail("");
    }, []),
  );

  const stackCancel =
    typeof navigation.canGoBack === "function" && navigation.canGoBack()
      ? { onPress: () => navigation.goBack(), label: t("common.cancel") }
      : undefined;

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const otpTrimmed = useMemo(() => normalizeEmailOtpInput(otpCode), [otpCode]);

  const isValidEmail = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailTrimmed);
  }, [emailTrimmed]);

  const isReviewLogin = useMemo(
    () => isAppStoreReviewEmail(emailTrimmed),
    [emailTrimmed],
  );

  const canSendCode = useMemo(
    () =>
      emailTrimmed.length > 0 && isValidEmail && !isSubmitting && !isVerifying,
    [emailTrimmed, isValidEmail, isSubmitting, isVerifying],
  );

  const canReviewSignIn = useMemo(
    () => canSendCode && password.length > 0 && !isSocialLoading,
    [canSendCode, password.length, isSocialLoading],
  );

  const canVerifyOtp = useMemo(
    () =>
      isValidEmailOtpLength(otpTrimmed.length) && !isVerifying && !isSubmitting,
    [otpTrimmed, isVerifying, isSubmitting],
  );

  const legalFooter = (
    <View style={styles.bottomLegalFooter}>
      <LegalLinksRow
        termsUrl={`${ENV.WEB_APP_URL}/terms`}
        privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
      />
    </View>
  );

  async function requestOtpForEmail(
    targetEmail: string,
    options?: { resend?: boolean },
  ) {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      if (isRateLimitError(error.message)) {
        toastError(
          `${t("auth.rateLimitExceeded")}. ${t("auth.rateLimitMessage")}`,
        );
        return false;
      }
      throw error;
    }

    if (!options?.resend) {
      setOtpSent(true);
      setSentEmail(targetEmail);
      setEmail("");
    }
    setOtpCode("");
    toastSuccess(t("auth.otpSent"));
    return true;
  }

  async function sendOtpCode() {
    try {
      setIsSubmitting(true);
      // Same API as magic link; Supabase sends OTP when the email template includes {{ .Token }}.
      // https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp
      await requestOtpForEmail(emailTrimmed);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtpCode() {
    if (!sentEmail.trim()) return;
    try {
      setIsSubmitting(true);
      await requestOtpForEmail(sentEmail.trim(), { resend: true });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtpCode() {
    try {
      setIsVerifying(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email: sentEmail,
        token: otpTrimmed,
        type: "email",
      });

      if (error) {
        if (isRateLimitError(error.message)) {
          toastError(
            `${t("auth.rateLimitExceeded")}. ${t("auth.rateLimitMessage")}`,
          );
          return;
        }
        if (isOtpExpiredOrInvalid(error.message)) {
          toastError(t("auth.otpInvalid"));
          return;
        }
        throw error;
      }

      if (!data.session) {
        throw new Error(t("auth.otpInvalid"));
      }

      toastSuccess(t("auth.signedInSuccessfully"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsVerifying(false);
    }
  }

  function resetOtpFlow() {
    setOtpSent(false);
    setSentEmail("");
    setOtpCode("");
    setEmail("");
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

    await persistOAuthDisplayName();
  }

  async function signInWithOAuth(provider: "google" | "apple") {
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

  async function signInWithAppleNative() {
    try {
      setIsSocialLoading("apple");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token from Apple");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;

      await persistOAuthDisplayName({ appleFullName: credential.fullName });

      toastSuccess(t("auth.signedInSuccessfully"));
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSocialLoading(null);
    }
  }

  async function signInWithApple() {
    if (Platform.OS === "ios" && appleSignInAvailable) {
      return signInWithAppleNative();
    }
    return signInWithOAuth("apple");
  }

  async function signInWithPasswordCredentials(input: {
    email: string;
    password: string;
    forceOnboardingFalse?: boolean;
  }) {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });

      if (error) throw error;
      if (input.forceOnboardingFalse) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { has_completed_onboarding: false },
        });
        if (updateError) throw updateError;
      }
      toastSuccess(t("auth.signedInSuccessfully"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithReviewPassword() {
    await signInWithPasswordCredentials({
      email: emailTrimmed,
      password,
    });
  }

  if (otpSent) {
    const displayEmail = sentEmail.trim();
    const otpBody = t("auth.otpSentBody", {
      email: displayEmail,
      length: EMAIL_OTP_LENGTH,
    });
    const emailIdx = displayEmail.length ? otpBody.indexOf(displayEmail) : -1;

    return (
      <ModalLayout cancel={stackCancel} footer={legalFooter}>
        <FormScreen noLayout scrollEnabled={false}>
          <NativeHeaderScrollView>
            <View style={styles.otpContainer}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="mail-outline"
                  size={56}
                  color={theme.colors.accent}
                />
              </View>

              <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.fg }]}>
                  {t("auth.otpSentTitle")}
                </Text>

                <Text style={[styles.body, { color: theme.colors.muted }]}>
                  {emailIdx >= 0 ? (
                    <>
                      {otpBody.slice(0, emailIdx)}
                      <Text style={styles.bodyEmail}>{displayEmail}</Text>
                      {otpBody.slice(emailIdx + displayEmail.length)}
                    </>
                  ) : (
                    otpBody
                  )}
                </Text>

                <Text style={[styles.hint, { color: theme.colors.muted }]}>
                  {t("auth.otpSentHint")}
                </Text>
              </View>

              <Card>
                <FormInputRow
                  variant="otp"
                  icon="keypad-outline"
                  label={t("auth.otpCodeLabel")}
                  value={otpCode}
                  onChangeText={(text) =>
                    setOtpCode(normalizeEmailOtpInput(text))
                  }
                  placeholder={t("auth.otpCodePlaceholder", {
                    length: EMAIL_OTP_LENGTH,
                  })}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={EMAIL_OTP_LENGTH}
                  editable={!isVerifying && !isSubmitting}
                />
              </Card>

              <Button
                onPress={verifyOtpCode}
                disabled={!canVerifyOtp}
                style={styles.primaryAction}
              >
                {isVerifying ? t("auth.otpVerifying") : t("auth.otpVerify")}
              </Button>

              <Button
                variant="outlined"
                onPress={resendOtpCode}
                disabled={isSubmitting || isVerifying}
              >
                {isSubmitting
                  ? t("auth.sendingCode")
                  : t("auth.sendAnotherCode")}
              </Button>

              <Button
                variant="ghost"
                onPress={resetOtpFlow}
                disabled={isVerifying}
              >
                {t("auth.changeEmail")}
              </Button>
            </View>
          </NativeHeaderScrollView>
        </FormScreen>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout cancel={stackCancel} footer={legalFooter}>
      <FormScreen noLayout scrollEnabled={false}>
        <NativeHeaderScrollView>
          <View style={styles.brandHeader}>
            <Logo width={72} height={72} />
            <Text
              style={[styles.brandName, { color: theme.colors.accent }]}
              numberOfLines={1}
            >
              {APP_DISPLAY_NAME}
            </Text>
            <Text
              style={[styles.brandTagline, { color: theme.colors.fg }]}
              numberOfLines={2}
            >
              {t("auth.brandMotto")}
            </Text>
          </View>

          <View style={[styles.emailSection, { marginTop: theme.spacing.lg }]}>
            <Card>
              <FormInputRow
                icon="mail-outline"
                label={t("auth.emailLabel")}
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.emailPlaceholder")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting && !isSocialLoading}
              />
              {isReviewLogin ? (
                <FormInputRow
                  icon="lock-closed-outline"
                  label={t("auth.passwordLabel")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  textContentType="password"
                  editable={!isSubmitting && !isSocialLoading}
                />
              ) : null}
            </Card>

            <Button
              onPress={
                isReviewLogin
                  ? () => void signInWithReviewPassword()
                  : sendOtpCode
              }
              disabled={isReviewLogin ? !canReviewSignIn : !canSendCode}
            >
              {isSubmitting
                ? t("common.loading")
                : isReviewLogin
                  ? t("auth.signIn")
                  : t("common.continue")}
            </Button>
          </View>

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

          <View style={styles.socialSection}>
            <View style={styles.socialButtons}>
              {(Platform.OS === "ios" ? appleSignInAvailable : true) ? (
                <Pressable
                  onPress={() => void signInWithApple()}
                  disabled={!!isSocialLoading}
                  style={({ pressed }) => [
                    styles.socialButton,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      opacity: isSocialLoading === "apple" || pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={theme.colors.fg}
                  />
                  <Text
                    style={[
                      styles.socialButtonText,
                      { color: theme.colors.fg },
                    ]}
                  >
                    {isSocialLoading === "apple"
                      ? t("common.loading")
                      : t("auth.apple")}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => void signInWithGoogle()}
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

          {ENV.APP_ENV === "development" && (
            <>
              <Button
                onPress={() =>
                  signInWithPasswordCredentials({
                    email: "test@user.com",
                    password: "testuser",
                  })
                }
                disabled={isSubmitting}
                variant="ghost"
                style={{ marginTop: theme.spacing.md }}
              >
                {isSubmitting ? t("common.loading") : "👤 Test User"}
              </Button>
              <Button
                onPress={() =>
                  signInWithPasswordCredentials({
                    email: "test-empty@user.com",
                    password: "testuser",
                  })
                }
                disabled={isSubmitting}
                variant="ghost"
                style={{ marginTop: theme.spacing.xs }}
              >
                {isSubmitting ? t("common.loading") : "🗂️ Empty Data User"}
              </Button>
              <Button
                onPress={() =>
                  signInWithPasswordCredentials({
                    email: "test-onboarding@user.com",
                    password: "testuser",
                    forceOnboardingFalse: true,
                  })
                }
                disabled={isSubmitting}
                variant="ghost"
                style={{ marginTop: theme.spacing.xs }}
              >
                {isSubmitting ? t("common.loading") : "🔁 Onboarding User"}
              </Button>
            </>
          )}
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    socialSection: {
      gap: theme.spacing.md,
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
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    socialButtonText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.lg,
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
    emailSection: {
      gap: theme.spacing.md,
    },
    brandHeader: {
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    brandName: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      fontFamily: BRAND_FONT_FAMILY,
      textAlign: "center",
      lineHeight: theme.typography.largeTitle + 6,
    },
    brandTagline: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
      lineHeight: theme.typography.title + 6,
      paddingHorizontal: theme.spacing.sm,
    },
    otpContainer: {
      width: "100%",
      gap: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
    iconContainer: {
      alignItems: "center",
    },
    content: {
      alignItems: "center",
      gap: theme.spacing.sm,
      width: "100%",
    },
    primaryAction: {
      marginTop: theme.spacing.xs,
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
    hint: {
      fontSize: theme.typography.small,
      textAlign: "center",
      lineHeight: theme.typography.body,
    },
    bodyEmail: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    bottomLegalFooter: {
      alignItems: "center",
    },
  });
