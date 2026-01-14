import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import type { VehicleType } from '../types/domain';
import { createVehicle } from '../services/vehicles/vehiclesRepo';
import { Button } from '../ui/components/Button';
import { Screen } from '../ui/components/Screen';
import { TextField } from '../ui/components/TextField';
import { theme } from '../ui/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleForm'>;

export function VehicleFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<VehicleType>('car');
  const [title, setTitle] = useState('');
  const [vin, setVin] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && make.trim().length > 0 && model.trim().length > 0 && year.trim().length === 4;
  }, [title, make, model, year]);

  async function onSave() {
    try {
      setSaving(true);
      const production_year = Number(year);
      if (!Number.isFinite(production_year)) throw new Error('Invalid year');

      const created = await createVehicle({
        type,
        title: title.trim(),
        vin: vin.trim().length ? vin.trim() : null,
        make: make.trim(),
        model: model.trim(),
        production_year,
      });

      navigation.replace('VehicleDetail', { vehicleId: created.id, title: created.title });
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.type')}</Text>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType('car')}
            style={[styles.typeChip, type === 'car' && styles.typeChipActive]}
          >
            <Text style={[styles.typeChipText, type === 'car' && styles.typeChipTextActive]}>
              {t('vehicleForm.car')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType('motorcycle')}
            style={[styles.typeChip, type === 'motorcycle' && styles.typeChipActive]}
          >
            <Text
              style={[
                styles.typeChipText,
                type === 'motorcycle' && styles.typeChipTextActive,
              ]}
            >
              {t('vehicleForm.motorcycle')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.titleLabel')}</Text>
        <TextField value={title} onChangeText={setTitle} placeholder={t('vehicleForm.titlePlaceholder')} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.vinLabel')}</Text>
        <TextField value={vin} onChangeText={setVin} autoCapitalize="characters" />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.makeLabel')}</Text>
        <TextField value={make} onChangeText={setMake} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.modelLabel')}</Text>
        <TextField value={model} onChangeText={setModel} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('vehicleForm.yearLabel')}</Text>
        <TextField value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
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
  group: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  typeChipActive: {
    borderColor: theme.colors.fg,
  },
  typeChipText: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: theme.colors.fg,
  },
});

