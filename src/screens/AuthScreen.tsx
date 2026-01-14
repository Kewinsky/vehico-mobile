import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../services/supabase/client';
import { Button } from '../ui/components/Button';
import { AppHeader } from '../ui/components/AppHeader';
import { FormScreen } from '../ui/components/FormScreen';
import { TextField } from '../ui/components/TextField';
import { useTheme } from '../ui/ThemeProvider';

export function AuthScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
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
    <FormScreen header={<AppHeader />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>{t('auth.title')}</Text>
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
        <TextField
          label={t('auth.passwordLabel')}
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
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 24,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  form: {
    gap: 10,
  },
  actions: {
    paddingTop: 12,
  },
});

