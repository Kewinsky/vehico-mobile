import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../providers/AuthProvider';
import { AuthScreen } from '../../screens/AuthScreen';
import { VehiclesScreen } from '../../screens/VehiclesScreen';
import { VehicleDetailScreen } from '../../screens/VehicleDetailScreen';
import { VehicleFormScreen } from '../../screens/VehicleFormScreen';
import { ServiceEntryFormScreen } from '../../screens/ServiceEntryFormScreen';
import { ServiceEntryDetailScreen } from '../../screens/ServiceEntryDetailScreen';
import { theme } from '../../ui/theme';

export type AppStackParamList = {
  Vehicles: undefined;
  VehicleForm: undefined;
  VehicleDetail: { vehicleId: string; title: string };
  ServiceEntryForm: { vehicleId: string };
  ServiceEntryDetail: { entryId: string; vehicleId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AppStackNavigator() {
  const { t } = useTranslation();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerShadowVisible: false,
        headerTintColor: theme.colors.fg,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AppStack.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{ title: t('vehicles.title') }}
      />
      <AppStack.Screen
        name="VehicleForm"
        component={VehicleFormScreen}
        options={{ title: t('vehicleForm.title') }}
      />
      <AppStack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <AppStack.Screen
        name="ServiceEntryForm"
        component={ServiceEntryFormScreen}
        options={{ title: t('entryForm.title') }}
      />
      <AppStack.Screen
        name="ServiceEntryDetail"
        component={ServiceEntryDetailScreen}
        options={{ title: 'Attachments' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="App" component={AppStackNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.muted,
  },
});

