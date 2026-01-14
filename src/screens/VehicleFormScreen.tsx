import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AppStackParamList } from '../app/navigation/RootNavigator';
import type { VehicleType } from '../types/domain';
import { createVehicle } from '../services/vehicles/vehiclesRepo';
import { Button } from '../ui/components/Button';
import { AppHeader } from '../ui/components/AppHeader';
import { FormScreen } from '../ui/components/FormScreen';
import { TextField } from '../ui/components/TextField';
import { useTheme } from '../ui/ThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleForm'>;

export function VehicleFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
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
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />
      <View style={styles.group}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>{t('vehicleForm.type')}</Text>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType('car')}
            style={[
              styles.typeChip,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
              type === 'car' && { borderColor: theme.colors.fg },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                { color: type === 'car' ? theme.colors.fg : theme.colors.muted },
              ]}
            >
              {t('vehicleForm.car')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType('motorcycle')}
            style={[
              styles.typeChip,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
              type === 'motorcycle' && { borderColor: theme.colors.fg },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                { color: type === 'motorcycle' ? theme.colors.fg : theme.colors.muted },
              ]}
            >
              {t('vehicleForm.motorcycle')}
            </Text>
          </Pressable>
        </View>
      </View>

      <TextField
        noMarginTop
        label={t('vehicleForm.titleLabel')}
        value={title}
        onChangeText={setTitle}
        placeholder={type === 'car' ? 'BMW 530d 2019' : 'Yamaha MT-07 2020'}
      />

      <TextField label={t('vehicleForm.vinLabel')} value={vin} onChangeText={setVin} autoCapitalize="characters" />

      <TextField label={t('vehicleForm.makeLabel')} value={make} onChangeText={setMake} />

      <TextField label={t('vehicleForm.modelLabel')} value={model} onChangeText={setModel} />

      <TextField label={t('vehicleForm.yearLabel')} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />

      <View style={{ height: 16 }} />
      <Button onPress={onSave} disabled={!canSave || saving}>
        {t('common.save')}
      </Button>
      <View style={{ height: 10 }} />
      <Button onPress={() => navigation.goBack()} variant="ghost" disabled={saving}>
        {t('common.cancel')}
      </Button>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    fontWeight: '700',
  },
});

