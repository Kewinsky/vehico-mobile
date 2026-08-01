import React, { useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { ENV } from "../../config/env";
import { requestEmailOtp } from "../../services/auth/requestEmailOtp";
import { ModalLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { LegalLinksRow } from "../../ui/components/common/LegalLinksRow";
import { TurnstileCaptcha } from "../../ui/components/auth/TurnstileCaptcha";
import { Glow } from "../../ui/components/dashboard/Glow";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { toastCaughtError, toastError, toastSuccess } from "../../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "AuthResendOtp">;

export function AuthResendOtpScreen({ navigation, route }: Props) {
  const email = route.params.email.trim();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const statusBarStyle = mode === "dark" ? "light" : "dark";
  const captchaEnabled = !!ENV.TURNSTILE_SITE_KEY;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const canSend =
    email.length > 0 &&
    !isSubmitting &&
    (!captchaEnabled || !!captchaToken);

  const glowBackground = (
    <Glow
      width={windowWidth}
      height={Math.round(windowHeight * 0.55)}
      mode={mode}
      style={styles.backgroundGlow}
    />
  );

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  }

  async function onSend() {
    if (captchaEnabled && !captchaToken) {
      toastError(t("auth.captchaRequired"));
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await requestEmailOtp({
        email,
        captchaToken,
      });
      resetCaptcha();

      if (!result.ok) {
        if (result.kind === "rate_limit") {
          toastError(
            `${t("auth.rateLimitExceeded")}. ${t("auth.rateLimitMessage")}`,
          );
          return;
        }
        if (result.kind === "captcha") {
          toastError(t("auth.captchaFailed"));
          return;
        }
        throw result.error ?? new Error(t("common.error"));
      }

      toastSuccess(t("auth.otpSent"));
      navigation.goBack();
    } catch (e: unknown) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const body = t("auth.resendOtpBody", { email });
  const emailIdx = email.length ? body.indexOf(email) : -1;

  return (
    <ModalLayout
      cancel={{
        onPress: () => navigation.goBack(),
        label: t("common.cancel"),
      }}
      footer={
        <View style={styles.bottomLegalFooter}>
          <LegalLinksRow
            termsUrl={`${ENV.WEB_APP_URL}/terms`}
            privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
          />
        </View>
      }
      background={glowBackground}
    >
      <StatusBar style={statusBarStyle} />
      <FormScreen noLayout scrollEnabled={false}>
        <NativeHeaderScrollView>
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="mail-outline"
                size={56}
                color={theme.colors.accent}
              />
            </View>

            <View style={styles.content}>
              <Text style={[styles.title, { color: theme.colors.fg }]}>
                {t("auth.resendOtpTitle")}
              </Text>
              <Text style={[styles.body, { color: theme.colors.muted }]}>
                {emailIdx >= 0 ? (
                  <>
                    {body.slice(0, emailIdx)}
                    <Text style={styles.bodyEmail}>{email}</Text>
                    {body.slice(emailIdx + email.length)}
                  </>
                ) : (
                  body
                )}
              </Text>
            </View>

            <Button onPress={() => void onSend()} disabled={!canSend}>
              {isSubmitting
                ? t("auth.sendingCode")
                : t("auth.sendAnotherCode")}
            </Button>

            {captchaEnabled ? (
              <TurnstileCaptcha
                resetKey={captchaResetKey}
                onTokenChange={setCaptchaToken}
              />
            ) : null}
          </View>
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    backgroundGlow: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    container: {
      gap: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
    iconContainer: {
      alignItems: "center",
    },
    content: {
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    body: {
      fontSize: theme.typography.body,
      textAlign: "center",
      lineHeight: theme.typography.body * 1.4,
    },
    bodyEmail: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    bottomLegalFooter: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.sm,
    },
  });
}
