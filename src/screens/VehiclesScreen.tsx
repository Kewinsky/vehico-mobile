import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import type { Vehicle } from '../types/domain';
import { listVehicles } from '../services/vehicles/vehiclesRepo';
import { useAuth } from '../app/providers/AuthProvider';
import { Button } from '../ui/components/Button';
import { Screen } from '../ui/components/Screen';
import { theme } from '../ui/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Vehicles'>;

export function VehiclesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listVehicles();
      setItems(data);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  return (
    <Screen padding={false}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('vehicles.title')}</Text>
        <Pressable onPress={() => void signOut()} hitSlop={10}>
          <Text style={styles.signOut}>{t('common.signOut')}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {items.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('vehicles.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('vehicles.emptyBody')}</Text>
            <View style={{ height: 16 }} />
            <Button onPress={() => navigation.navigate('VehicleForm')}>
              {t('vehicles.addVehicle')}
            </Button>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(v) => v.id}
              contentContainerStyle={styles.list}
              refreshing={loading}
              onRefresh={load}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    navigation.navigate('VehicleDetail', { vehicleId: item.id, title: item.title })
                  }
                  style={styles.vehicleCard}
                >
                  <Text style={styles.vehicleTitle}>{item.title}</Text>
                  <Text style={styles.vehicleMeta}>
                    {item.type.toUpperCase()} · {item.make} {item.model} · {item.production_year}
                  </Text>
                  {!!item.vin && <Text style={styles.vehicleMeta}>VIN: {item.vin}</Text>}
                </Pressable>
              )}
              ListFooterComponent={
                <View style={{ paddingTop: 12 }}>
                  <Button onPress={() => navigation.navigate('VehicleForm')}>
                    {t('vehicles.addVehicle')}
                  </Button>
                </View>
              }
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.fg,
  },
  signOut: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.fg,
  },
  emptyBody: {
    marginTop: 8,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  list: {
    paddingBottom: theme.spacing.xl,
    gap: 12,
  },
  vehicleCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 6,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.fg,
  },
  vehicleMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
});

