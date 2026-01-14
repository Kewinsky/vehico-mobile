import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import { createServiceEntry } from '../services/serviceEntries/serviceEntriesRepo';
import { Button } from '../ui/components/Button';
import { Screen } from '../ui/components/Screen';
import { TextField } from '../ui/components/TextField';
import { theme } from '../ui/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ServiceEntryForm'>;

export function ServiceEntryFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { vehicleId } = route.params;

  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    return serviceDate.trim().length === 10 && title.trim().length > 0;
  }, [serviceDate, title]);

  async function onSave() {
    try {
      setSaving(true);
      await createServiceEntry({
        vehicle_id: vehicleId,
        service_date: serviceDate.trim(),
        mileage: mileage.trim().length ? Number(mileage) : null,
        title: title.trim(),
        description: description.trim(),
        cost: cost.trim().length ? Number(cost) : null,
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t('entryForm.ocrDisclaimer')}</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('entryForm.serviceDate')}</Text>
        <TextField value={serviceDate} onChangeText={setServiceDate} placeholder="YYYY-MM-DD" />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('entryForm.mileage')}</Text>
        <TextField value={mileage} onChangeText={setMileage} keyboardType="number-pad" />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('entryForm.entryTitle')}</Text>
        <TextField value={title} onChangeText={setTitle} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('entryForm.description')}</Text>
        <TextField value={description} onChangeText={setDescription} multiline style={styles.multiline} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('entryForm.cost')}</Text>
        <TextField value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
      </View>

      <View style={{ height: 16 }} />
      <Button onPress={onSave} disabled={!canSave || saving}>
        {t('common.save')}
      </Button>
      <View style={{ height: 10 }} />
      <Button onPress={() => navigation.goBack()} variant="ghost" disabled={saving}>
        {t('common.cancel')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 18,
  },
  group: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  multiline: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});

