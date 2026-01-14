import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './AuthProvider';
import { VehicoI18nProvider } from './I18nProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <VehicoI18nProvider>
      <SafeAreaProvider>
        <AuthProvider>{children}</AuthProvider>
      </SafeAreaProvider>
    </VehicoI18nProvider>
  );
}

