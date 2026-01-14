import { StatusBar } from 'expo-status-bar';
import { Component, type PropsWithChildren } from 'react';
import { Alert, Text, View } from 'react-native';

import { AppProviders } from './providers/AppProviders';
import { RootNavigator } from './navigation/RootNavigator';
import { theme } from '../ui/theme';

class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // In production we could wire Sentry etc.
    Alert.alert('App error', error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.fg }}>Configuration needed</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>
            {this.state.error.message}
          </Text>
          <Text style={{ marginTop: 12, color: theme.colors.muted }}>
            Expected env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function Root() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RootNavigator />
        <StatusBar style="dark" />
      </AppProviders>
    </ErrorBoundary>
  );
}

