import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import { supabase } from '../services/supabase/client';
import { ENV } from '../config/env';
import { Button } from '../ui/components/Button';
import { AppHeader } from '../ui/components/AppHeader';
import { FormScreen } from '../ui/components/FormScreen';
import { TextField } from '../ui/components/TextField';
import { useTheme } from '../ui/ThemeProvider';
import { toastError, toastSuccess } from '../ui/toast/toast';

type Props = NativeStackScreenProps<AppStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSendResetEmail() {
    const emailTrimmed = email.trim();
    
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      toastError(t('common.error'), t('auth.enterValidEmail'));
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
        redirectTo: `${ENV.SUPABASE_URL}/auth/v1/callback`,
      });

      if (error) throw error;
      
      setEmailSent(true);
      toastSuccess(t('common.success'), t('auth.passwordResetEmailSent'));
    } catch (e: any) {
      toastError(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: theme.colors.accent }]}>✉️</Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t('auth.resetPasswordEmailSentTitle')}
            </Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>
              {t('auth.resetPasswordEmailSentBody', { email: email.trim() })}
            </Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {t('auth.resetPasswordEmailSentHint')}
            </Text>
          </View>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.fg }]}>
            {t('auth.forgotPasswordTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {t('auth.forgotPasswordSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            noMarginTop
            label={t('auth.emailLabel')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t('auth.emailPlaceholder')}
            editable={!isSubmitting}
          />

          <View style={styles.actions}>
            <Button onPress={handleSendResetEmail} disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? t('auth.sendingEmail') : t('auth.sendResetEmail')}
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    formContainer: {
      flex: 1,
      paddingVertical: theme.spacing.lg,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: 64,
    },
    header: {
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      width: '100%',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.body,
      marginTop: theme.spacing.xs,
      lineHeight: 22,
    },
    form: {
      gap: theme.spacing.sm,
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
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    secondaryButton: {
      marginTop: 0,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });
