import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../services/supabase/client';
import { Button } from '../ui/components/Button';
import { Screen } from '../ui/components/Screen';
import { TextField } from '../ui/components/TextField';
import { theme } from '../ui/theme';

export function AuthScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const canSubmit =
    emailTrimmed.length > 3 &&
    emailTrimmed.includes('@') &&
    password.length >= 6 &&
    !isSubmitting;

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (error) throw error;
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.appName}>{t('common.appName')}</Text>
        <Text style={styles.title}>{t('auth.title')}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('auth.emailLabel')}</Text>
        <TextField
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder={t('auth.emailPlaceholder')}
          editable={!isSubmitting}
        />
        <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
        <TextField
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder={t('auth.passwordPlaceholder')}
          editable={!isSubmitting}
        />
        <View style={styles.actions}>
          <Button onPress={onSubmit} disabled={!canSubmit}>
            {t('auth.signIn')}
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: 8,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.fg,
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: theme.typography.small,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  actions: {
    paddingTop: theme.spacing.sm,
  },
});

