import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import type { ServiceEntry } from '../types/domain';
import { listServiceEntries } from '../services/serviceEntries/serviceEntriesRepo';
import { getOrCreatePublicPage } from '../services/publicPages/publicPagesRepo';
import { Button } from '../ui/components/Button';
import { Screen } from '../ui/components/Screen';
import { TimelineItem } from '../ui/components/TimelineItem';
import { theme } from '../ui/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleDetail'>;

function formatDate(iso: string) {
  // Keep simple (trustworthy, document-like): YYYY-MM-DD
  return iso.slice(0, 10);
}

export function VehicleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { vehicleId } = route.params;
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listServiceEntries(vehicleId);
      setItems(data);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  const footer = useMemo(() => {
    return (
      <View style={{ paddingTop: 14 }}>
        <Button
          onPress={async () => {
            try {
              setSharing(true);
              const page = await getOrCreatePublicPage(vehicleId);
              Alert.alert('Public link', `Public ID: ${page.public_id}\n\n${t('public.note')}`);
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? String(e));
            } finally {
              setSharing(false);
            }
          }}
          variant="ghost"
          disabled={sharing}
        >
          {sharing ? 'Working…' : t('public.generate')}
        </Button>
        <View style={{ height: 10 }} />
        <Button onPress={() => navigation.navigate('ServiceEntryForm', { vehicleId })}>
          {t('timeline.addEntry')}
        </Button>
      </View>
    );
  }, [navigation, t, vehicleId, sharing]);

  return (
    <Screen padding={false}>
      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{route.params.title}</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('timeline.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('timeline.emptyBody')}</Text>
              <View style={{ height: 16 }} />
              <Button onPress={() => navigation.navigate('ServiceEntryForm', { vehicleId })}>
                {t('timeline.addEntry')}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('ServiceEntryDetail', { entryId: item.id, vehicleId })
            }
          >
            <TimelineItem
              dateLabel={formatDate(item.service_date)}
              title={item.title}
              subtitle={[
                item.mileage ? `${item.mileage.toLocaleString()} km` : null,
                item.cost != null ? `${item.cost}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={footer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  empty: {
    paddingTop: theme.spacing.xl,
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
});

