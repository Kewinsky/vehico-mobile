import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import { getOrCreatePublicPage } from '../services/publicPages/publicPagesRepo';
import { AppHeader } from '../ui/components/AppHeader';
import { Screen } from '../ui/components/Screen';
import { useTheme } from '../ui/ThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleDashboard'>;

type Tile = {
  key: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onPress: () => void;
};

export function VehicleDashboardScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId, title } = route.params;

  const tiles: Tile[] = [
    {
      key: 'service',
      title: t('dashboard.tiles.serviceTitle'),
      subtitle: t('dashboard.tiles.serviceSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('VehicleDetail', { vehicleId, title }),
    },
    {
      key: 'fuel',
      title: t('dashboard.tiles.fuelTitle'),
      subtitle: t('dashboard.tiles.fuelSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('FuelCosts', { vehicleId, title }),
    },
    {
      key: 'docs',
      title: t('dashboard.tiles.docsTitle'),
      subtitle: t('dashboard.tiles.docsSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('Documents', { vehicleId, title }),
    },
    {
      key: 'reminders',
      title: t('dashboard.tiles.remindersTitle'),
      subtitle: t('dashboard.tiles.remindersSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('Reminders', { vehicleId, title }),
    },
    {
      key: 'share',
      title: t('dashboard.tiles.shareTitle'),
      subtitle: t('dashboard.tiles.shareSubtitle'),
      enabled: true,
      onPress: async () => {
        try {
          const page = await getOrCreatePublicPage(vehicleId);
          Alert.alert(t('dashboard.publicLinkTitle'), t('dashboard.publicLinkBody', { id: page.public_id }));
        } catch (e: any) {
          Alert.alert(t('common.error'), e?.message ?? String(e));
        }
      },
    },
    {
      key: 'data',
      title: t('dashboard.tiles.dataTitle'),
      subtitle: t('dashboard.tiles.dataSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('DataPortability', { vehicleId, title }),
    },
    {
      key: 'manage',
      title: t('dashboard.tiles.manageTitle'),
      subtitle: t('dashboard.tiles.manageSubtitle'),
      enabled: true,
      onPress: () => navigation.navigate('ManageVehicle', { vehicleId, title }),
    },
  ];

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('dashboard.kicker')}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <FlatList
        data={tiles}
        numColumns={2}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.tile,
              !item.enabled && styles.tileDisabled,
              pressed && item.enabled && styles.tilePressed,
            ]}
          >
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={styles.tileSubtitle}>{item.subtitle}</Text>
            {!item.enabled ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Unavailable</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable onPress={() => navigation.navigate('Vehicles')} hitSlop={10}>
              <Text style={styles.backLink}>{t('dashboard.backToVehicles')}</Text>
            </Pressable>
          </View>
        }
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      paddingTop: 16,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 16,
      gap: 6,
    },
    kicker: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.fg,
      fontSize: 22,
      fontWeight: '800',
    },
    grid: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: 12,
    },
    row: {
      gap: 12,
    },
    tile: {
      flex: 1,
      minHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 8,
      justifyContent: 'space-between',
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileDisabled: {
      opacity: 0.55,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: 16,
      fontWeight: '800',
    },
    tileSubtitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      lineHeight: 18,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    badgeText: {
      color: theme.colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    footer: {
      paddingTop: 18,
      alignItems: 'center',
    },
    backLink: {
      color: theme.colors.muted,
      fontWeight: '700',
    },
  });

