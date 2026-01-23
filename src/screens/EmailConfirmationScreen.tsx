import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import { supabase } from '../services/supabase/client';
import { ENV } from '../config/env';
import { Button } from '../ui/components/Button';
import { AppHeader } from '../ui/components/AppHeader';
import { FormScreen } from '../ui/components/FormScreen';
import { useTheme } from '../ui/ThemeProvider';
import { toastError, toastSuccess } from '../ui/toast/toast';

type Props = NativeStackScreenProps<AppStackParamList, 'EmailConfirmation'>;

export function EmailConfirmationScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);

  async function resendConfirmationEmail() {
    try {
      setIsResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${ENV.SUPABASE_URL}/auth/v1/callback`,
        },
      });

      if (error) throw error;
      toastSuccess(t('common.success'), t('auth.confirmationEmailResent'));
    } catch (e: any) {
      toastError(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsResending(false);
    }
  }

  async function openEmailApp() {
    const emailUrl = `mailto:${email}`;
    const canOpen = await Linking.canOpenURL(emailUrl);
    if (canOpen) {
      await Linking.openURL(emailUrl);
    }
  }

  return (
    <FormScreen header={<AppHeader />}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { color: theme.colors.accent }]}>✉️</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t('auth.confirmEmailTitle')}
          </Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>
            {t('auth.confirmEmailBody', { email })}
          </Text>
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            {t('auth.confirmEmailHint')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button onPress={resendConfirmationEmail} disabled={isResending}>
            {isResending ? t('auth.resendingEmail') : t('auth.resendEmail')}
          </Button>
          <Button variant="ghost" onPress={openEmailApp} style={styles.secondaryButton}>
            {t('auth.openEmailApp')}
          </Button>
          <Button
            variant="ghost"
            onPress={() => navigation.navigate('Auth')}
            style={styles.backButton}
          >
            {t('auth.backToSignIn')}
          </Button>
        </View>
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: 64,
    },
    content: {
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    body: {
      fontSize: theme.typography.body,
      textAlign: 'center',
      lineHeight: 22,
    },
    hint: {
      fontSize: theme.typography.small,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      lineHeight: 18,
    },
    actions: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    secondaryButton: {
      marginTop: 0,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });
