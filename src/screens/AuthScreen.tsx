import { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import { supabase } from '../services/supabase/client';
import { Button } from '../ui/components/Button';
import { AppHeader } from '../ui/components/AppHeader';
import { FormScreen } from '../ui/components/FormScreen';
import { TextField } from '../ui/components/TextField';
import { useTheme } from '../ui/ThemeProvider';
import { toastError, toastSuccess } from '../ui/toast/toast';
import { ENV } from '../config/env';

type Props = NativeStackScreenProps<AppStackParamList, 'Auth'>;

export function AuthScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(route.params?.initialMode === 'signUp');
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Update sign up mode when route params change
  useEffect(() => {
    if (route.params?.initialMode === 'signUp') {
      setIsSignUp(true);
    } else if (route.params?.initialMode === 'signIn') {
      setIsSignUp(false);
    }
  }, [route.params?.initialMode]);

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  
  const canSubmitSignIn = useMemo(
    () =>
      emailTrimmed.length > 3 &&
      emailTrimmed.includes('@') &&
      password.length >= 6 &&
      !isSubmitting,
    [emailTrimmed, password, isSubmitting]
  );

  const canSubmitSignUp = useMemo(
    () =>
      emailTrimmed.length > 3 &&
      emailTrimmed.includes('@') &&
      password.length >= 6 &&
      confirmPassword === password &&
      acceptedTerms &&
      !isSubmitting,
    [emailTrimmed, password, confirmPassword, acceptedTerms, isSubmitting]
  );

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      
      if (isSignUp) {
        if (password !== confirmPassword) {
          toastError(t('common.error'), t('auth.passwordsDoNotMatch'));
          return;
        }

        if (!acceptedTerms) {
          toastError(t('common.error'), t('auth.mustAcceptTerms'));
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: {
            emailRedirectTo: `${ENV.SUPABASE_URL}/auth/v1/callback`,
          },
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required
          navigation.navigate('EmailConfirmation', { email: emailTrimmed });
          toastSuccess(t('auth.signUpSuccess'), t('auth.emailConfirmationSent'));
          return;
        }

        // If session exists, user is already confirmed (shouldn't happen in production)
        if (data.session) {
          toastSuccess(t('common.success'), t('auth.signUpSuccess'));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });

        if (error) {
          // Check if email is not confirmed
          if (error.message.includes('email') && error.message.includes('confirm')) {
            navigation.navigate('EmailConfirmation', { email: emailTrimmed });
            toastError(t('auth.emailNotConfirmed'), t('auth.pleaseConfirmEmail'));
            return;
          }
          throw error;
        }
      }
    } catch (e: any) {
      toastError(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    navigation.navigate('ForgotPassword');
  }

  async function signInWithGoogle() {
    // Placeholder - będzie zaimplementowane później
    try {
      setIsSocialLoading('google');
      await new Promise(resolve => setTimeout(resolve, 1500));
      toastError(t('common.error'), t('auth.socialLoginComingSoon'));
    } catch (e: any) {
      toastError(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsSocialLoading(null);
    }
  }

  async function signInWithFacebook() {
    // Placeholder - będzie zaimplementowane później
    try {
      setIsSocialLoading('facebook');
      await new Promise(resolve => setTimeout(resolve, 1500));
      toastError(t('common.error'), t('auth.socialLoginComingSoon'));
    } catch (e: any) {
      toastError(t('common.error'), e?.message ?? String(e));
    } finally {
      setIsSocialLoading(null);
    }
  }

  function handleSwitchTab(newMode: boolean) {
    setIsSignUp(newMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
        <Pressable
          onPress={() => handleSwitchTab(false)}
          style={[
            styles.tab,
            {
              backgroundColor: !isSignUp ? theme.colors.accent : 'transparent',
              borderWidth: !isSignUp ? 0 : 1,
              borderColor: !isSignUp ? 'transparent' : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: !isSignUp ? '#000000' : theme.colors.muted },
            ]}
          >
            {t('auth.signIn')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSwitchTab(true)}
          style={[
            styles.tab,
            {
              backgroundColor: isSignUp ? theme.colors.accent : 'transparent',
              borderWidth: isSignUp ? 0 : 1,
              borderColor: isSignUp ? 'transparent' : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: isSignUp ? '#000000' : theme.colors.muted },
            ]}
          >
            {t('auth.signUp')}
          </Text>
        </Pressable>
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
          editable={!isSubmitting && !isSocialLoading}
        />
        <TextField
          label={t('auth.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder={t('auth.passwordPlaceholder')}
          editable={!isSubmitting && !isSocialLoading}
        />

        {isSignUp && (
          <TextField
            label={t('auth.confirmPasswordLabel')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder={t('auth.confirmPasswordPlaceholder')}
            editable={!isSubmitting && !isSocialLoading}
          />
        )}

        {!isSignUp && (
          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.colors.accent }]}>
              {t('auth.forgotPassword')}
            </Text>
          </Pressable>
        )}

        {isSignUp && (
          <View style={styles.termsContainer}>
            <Pressable
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              style={styles.checkboxRow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedTerms ? theme.colors.accent : theme.colors.card,
                    borderColor: acceptedTerms ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                {acceptedTerms && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={[styles.termsText, { color: theme.colors.fg }]}>
                  {t('auth.acceptTerms')}{' '}
                  <Text
                    style={[styles.termsLink, { color: theme.colors.accent }]}
                    onPress={() => navigation.navigate('TermsOfUse')}
                  >
                    {t('auth.termsOfUse')}
                  </Text>
                  {' '}{t('common.and')}{' '}
                  <Text
                    style={[styles.termsLink, { color: theme.colors.accent }]}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    {t('auth.privacyPolicy')}
                  </Text>
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            onPress={onSubmit}
            disabled={isSignUp ? !canSubmitSignUp : !canSubmitSignIn}
          >
            {isSubmitting
              ? isSignUp
                ? t('auth.signingUp')
                : t('auth.signingIn')
              : isSignUp
              ? t('auth.signUp')
              : t('auth.signIn')}
          </Button>
        </View>

        {!isSignUp && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.muted }]}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <View style={styles.socialButtons}>
              <Pressable
                onPress={signInWithFacebook}
                disabled={!!isSocialLoading}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: isSocialLoading === 'facebook' || pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-facebook" size={20} color={theme.colors.fg} />
                <Text style={[styles.socialButtonText, { color: theme.colors.fg }]}>
                  {isSocialLoading === 'facebook' ? t('common.loading') : t('auth.facebook')}
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
                    opacity: isSocialLoading === 'google' || pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-google" size={20} color={theme.colors.fg} />
                <Text style={[styles.socialButtonText, { color: theme.colors.fg }]}>
                  {isSocialLoading === 'google' ? t('common.loading') : t('auth.google')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: 4,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.sm,
    },
    tabText: {
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
    form: {
      gap: theme.spacing.sm,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: -theme.spacing.xs,
    },
    forgotPasswordText: {
      fontSize: theme.typography.small,
      fontWeight: '600',
    },
    termsContainer: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkmark: {
      color: '#000000',
      fontSize: 12,
      fontWeight: '700',
    },
    termsTextContainer: {
      flex: 1,
    },
    termsText: {
      fontSize: theme.typography.small,
      lineHeight: 18,
    },
    termsLink: {
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    actions: {
      paddingTop: theme.spacing.sm,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: theme.typography.small,
      fontWeight: '600',
    },
    socialButtons: {
      gap: theme.spacing.sm,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      height: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
    },
    socialButtonText: {
      fontSize: theme.typography.body,
      fontWeight: '600',
    },
  });
