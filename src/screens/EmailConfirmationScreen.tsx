import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as AuthSession from "expo-auth-session";

import type { RootStackParamList } from "../app/navigation/types";
import { supabase } from "../services/supabase/client";
import { ENV } from "../config/env";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";

type Props = NativeStackScreenProps<RootStackParamList, "EmailConfirmation">;

export function EmailConfirmationScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const email = route.params?.email ?? "";
  const [isResending, setIsResending] = useState(false);

  async function resendConfirmationEmail() {
    try {
      setIsResending(true);

      // Use makeRedirectUri() which automatically handles Expo Go (exp://) and production (vehico://)
      const emailRedirectTo = AuthSession.makeRedirectUri({
        path: "auth/confirm-email",
      });

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;
      toastSuccess(t("auth.confirmationEmailResent"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: theme.colors.accent }]}>
              ✉️
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("auth.confirmEmailTitle")}
            </Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>
              {t("auth.confirmEmailBody", { email })}
            </Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {t("auth.confirmEmailHint")}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button onPress={resendConfirmationEmail} disabled={isResending}>
              {isResending ? t("auth.resendingEmail") : t("auth.resendEmail")}
            </Button>
          </View>
        </View>
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    contentWrapper: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
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
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      width: "100%",
    },
    title: {
      fontSize: theme.typography.title,
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
      lineHeight: theme.typography.body + 2,
    },
    actions: {
      width: "100%",
      gap: theme.spacing.sm,
    },
  });
