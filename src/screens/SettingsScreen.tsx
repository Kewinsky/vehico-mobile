import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '../ui/components/AppHeader';
import { Screen } from '../ui/components/Screen';
import { useUserSettings } from '../app/providers/UserSettingsProvider';
import { useTheme } from '../ui/ThemeProvider';

export function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings, setSettings } = useUserSettings();

  async function pick<K extends keyof NonNullable<typeof settings>>(key: K, value: any) {
    try {
      await setSettings({ [key]: value } as any);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    }
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md }}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>{t('settings.title')}</Text>

      <View style={[styles.box, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <Text style={[styles.section, { color: theme.colors.muted }]}>{t('settings.currency')}</Text>
        <View style={styles.row}>
          {(['PLN', 'EUR'] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => void pick('currency', c)}
              style={[
                styles.choice,
                { borderColor: theme.colors.border },
                settings?.currency === c && { borderColor: theme.colors.fg },
              ]}
            >
              <Text style={{ color: settings?.currency === c ? theme.colors.fg : theme.colors.muted, fontWeight: '800' }}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 12 }} />
          <Text style={[styles.section, { color: theme.colors.muted }]}>{t('settings.distanceUnit')}</Text>
        <View style={styles.row}>
          {(['km', 'miles'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => void pick('distance_unit', u)}
              style={[
                styles.choice,
                { borderColor: theme.colors.border },
                settings?.distance_unit === u && { borderColor: theme.colors.fg },
              ]}
            >
              <Text style={{ color: settings?.distance_unit === u ? theme.colors.fg : theme.colors.muted, fontWeight: '800' }}>
                {u}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 12 }} />
          <Text style={[styles.section, { color: theme.colors.muted }]}>{t('settings.fuelUnit')}</Text>
        <View style={styles.row}>
          {(['liters', 'gallons'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => void pick('fuel_unit', u)}
              style={[
                styles.choice,
                { borderColor: theme.colors.border },
                settings?.fuel_unit === u && { borderColor: theme.colors.fg },
              ]}
            >
              <Text style={{ color: settings?.fuel_unit === u ? theme.colors.fg : theme.colors.muted, fontWeight: '800' }}>
                {u}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 12 }} />
          <Text style={[styles.section, { color: theme.colors.muted }]}>{t('settings.theme')}</Text>
        <View style={styles.row}>
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => void pick('theme', m)}
              style={[
                styles.choice,
                { borderColor: theme.colors.border },
                settings?.theme === m && { borderColor: theme.colors.fg },
              ]}
            >
              <Text style={{ color: settings?.theme === m ? theme.colors.fg : theme.colors.muted, fontWeight: '800' }}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 12 }} />
          <Text style={[styles.section, { color: theme.colors.muted }]}>{t('settings.language')}</Text>
        <View style={styles.row}>
          {(['en', 'pl'] as const).map((lng) => (
            <Pressable
              key={lng}
              onPress={() => void pick('language', lng)}
              style={[
                styles.choice,
                { borderColor: theme.colors.border },
                settings?.language === lng && { borderColor: theme.colors.fg },
              ]}
            >
              <Text style={{ color: settings?.language === lng ? theme.colors.fg : theme.colors.muted, fontWeight: '800' }}>
                {lng.toUpperCase()}
              </Text>
            </Pressable>
          ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  body: { marginTop: 8, lineHeight: 22 },
  box: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  section: { fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  choice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});

