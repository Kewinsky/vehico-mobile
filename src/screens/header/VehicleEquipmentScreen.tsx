import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import {
  VEHICLE_EQUIPMENT_CATEGORY_IDS,
  VEHICLE_EQUIPMENT_PRESETS_BY_CATEGORY,
  normalizeVehicleEquipmentPresetKeys,
  type VehicleEquipmentPresetKey,
} from "../../constants/vehicleEquipmentPresets";
import type { VehicleEquipment } from "../../types/domain";
import {
  listVehicleEquipment,
  replaceVehicleEquipment,
} from "../../services/equipment/vehicleEquipmentRepo";
import { useScreenFocusReload } from "../../app/useScreenFocusReload";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalButton } from "../../ui/components/layout/ModalButton";
import { Card } from "../../ui/components/common/Card";
import { Button } from "../../ui/components/common/Button";
import { LoadingIndicator } from "../../ui/components/common/LoadingIndicator";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { useTheme } from "../../ui/ThemeProvider";
import type { AppTheme } from "../../ui/theme";
import {
  toastCaughtError,
  toastError,
  toastSuccess,
} from "../../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleEquipment">;

type DraftCustom = {
  localId: string;
  label: string;
};

type DraftState = {
  presets: VehicleEquipmentPresetKey[];
  customs: DraftCustom[];
};

function draftFromItems(items: VehicleEquipment[]): DraftState {
  const rawKeys: string[] = [];
  const customs: DraftCustom[] = [];
  for (const item of items) {
    if (item.preset_key) {
      rawKeys.push(item.preset_key);
    } else {
      customs.push({ localId: item.id, label: item.label });
    }
  }
  return {
    presets: normalizeVehicleEquipmentPresetKeys(rawKeys),
    customs,
  };
}

function serializeDraft(draft: DraftState): string {
  return JSON.stringify({
    presets: [...draft.presets].sort(),
    customs: draft.customs.map((c) => c.label.trim().toLowerCase()).sort(),
  });
}

function EquipmentPill({
  label,
  selected,
  onPress,
  disabled,
  styles,
  accent,
  mutedFg,
  grayBg,
  accentFg,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  styles: ReturnType<typeof makeStyles>;
  accent: string;
  mutedFg: string;
  grayBg: string;
  accentFg: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? accent : grayBg,
        },
        pressed && { opacity: 0.88 },
        disabled && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.pillLabel, { color: selected ? accentFg : mutedFg }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function VehicleEquipmentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const grayBg = useMemo(
    () => hexToRgba(theme.colors.muted, 0.16),
    [theme.colors.muted],
  );
  // Accent is bright yellow – dark label keeps contrast in both themes.
  const accentFg = "#111111";

  const [draft, setDraft] = useState<DraftState>({
    presets: [],
    customs: [],
  });
  const [savedSignature, setSavedSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const isDirtyRef = useRef(false);

  const applyLoadedItems = useCallback((items: VehicleEquipment[]) => {
    const next = draftFromItems(items);
    setDraft(next);
    setSavedSignature(serializeDraft(next));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listVehicleEquipment(vehicleId);
      applyLoadedItems(data);
    } catch (e: unknown) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [applyLoadedItems, vehicleId, t]);

  useScreenFocusReload({
    initialLoad: () => load(),
    onFocusReload: () => {
      if (isDirtyRef.current) return;
      void load();
    },
    deferFocusReload: true,
  });

  const selectedPresetKeys = useMemo(
    () => new Set(draft.presets),
    [draft.presets],
  );

  const isDirty = useMemo(
    () => serializeDraft(draft) !== savedSignature,
    [draft, savedSignature],
  );
  isDirtyRef.current = isDirty;

  const presetLabel = useCallback(
    (key: VehicleEquipmentPresetKey) => t(`equipment.presets.${key}` as const),
    [t],
  );

  function togglePreset(key: VehicleEquipmentPresetKey) {
    setDraft((prev) => {
      const has = prev.presets.includes(key);
      return {
        ...prev,
        presets: has
          ? prev.presets.filter((k) => k !== key)
          : [...prev.presets, key],
      };
    });
  }

  function handleAddCustom() {
    const trimmed = customLabel.trim();
    if (!trimmed.length) {
      toastError(t("equipment.customLabelRequired"));
      return;
    }
    const duplicate = draft.customs.some(
      (item) => item.label.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toastError(t("equipment.customDuplicate"));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      customs: [
        ...prev.customs,
        {
          localId: `local-${Date.now()}-${prev.customs.length}`,
          label: trimmed,
        },
      ],
    }));
    setCustomLabel("");
  }

  function removeCustom(localId: string) {
    setDraft((prev) => ({
      ...prev,
      customs: prev.customs.filter((item) => item.localId !== localId),
    }));
  }

  function confirmRemoveCustom(item: DraftCustom) {
    Alert.alert(t("equipment.removeCustomTitle"), item.label, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => removeCustom(item.localId),
      },
    ]);
  }

  async function onSave() {
    if (!isDirty || saving) return;

    setSaving(true);
    try {
      const payload = [
        ...draft.presets.map((key) => ({
          preset_key: key,
          label: presetLabel(key),
        })),
        ...draft.customs.map((item) => ({
          preset_key: null,
          label: item.label.trim(),
        })),
      ];
      const saved = await replaceVehicleEquipment(vehicleId, payload);
      applyLoadedItems(saved);
      toastSuccess(t("equipment.saved"));
    } catch (e: unknown) {
      toastCaughtError(e, t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  const headerRight = (
    <ModalButton
      variant="done"
      onPress={() => void onSave()}
      disabled={!isDirty}
      loading={saving}
    >
      {t("common.save")}
    </ModalButton>
  );

  return (
    <HeaderLayout onBack={() => navigation.goBack()} right={headerRight}>
      <NativeHeaderScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <ContentHeader
          title={t("equipment.title")}
          subtitle={t("equipment.subtitle")}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <LoadingIndicator />
          </View>
        ) : (
          <>
            {VEHICLE_EQUIPMENT_CATEGORY_IDS.map((categoryId) => (
              <Card key={categoryId} style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t(`equipment.categories.${categoryId}` as const)}
                </Text>
                <View style={styles.pillsWrap}>
                  {VEHICLE_EQUIPMENT_PRESETS_BY_CATEGORY[categoryId].map(
                    (key) => (
                      <EquipmentPill
                        key={key}
                        label={presetLabel(key)}
                        selected={selectedPresetKeys.has(key)}
                        disabled={saving}
                        onPress={() => togglePreset(key)}
                        styles={styles}
                        accent={theme.colors.accent}
                        mutedFg={theme.colors.fg}
                        grayBg={grayBg}
                        accentFg={accentFg}
                      />
                    ),
                  )}
                </View>
              </Card>
            ))}

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t("equipment.customSection")}
              </Text>
              {draft.customs.length > 0 ? (
                <View style={styles.pillsWrap}>
                  {draft.customs.map((item) => (
                    <EquipmentPill
                      key={item.localId}
                      label={item.label}
                      selected
                      disabled={saving}
                      onPress={() => confirmRemoveCustom(item)}
                      styles={styles}
                      accent={theme.colors.accent}
                      mutedFg={theme.colors.fg}
                      grayBg={grayBg}
                      accentFg={accentFg}
                    />
                  ))}
                </View>
              ) : null}

              <View style={[styles.addCustomRow]}>
                <TextInput
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  placeholder={t("equipment.addCustomPlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  editable={!saving}
                  style={[
                    styles.customInput,
                    {
                      color: theme.colors.fg,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  returnKeyType="done"
                  onSubmitEditing={handleAddCustom}
                />
                <Button
                  variant="outlined"
                  onPress={handleAddCustom}
                  disabled={saving || customLabel.trim().length === 0}
                >
                  {t("equipment.addCustom")}
                </Button>
              </View>
            </Card>
          </>
        )}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    loadingWrap: {
      paddingVertical: theme.spacing.md * 2,
      alignItems: "center",
    },
    card: {
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    pillsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    pill: {
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.sm,
      maxWidth: "100%",
    },
    pillLabel: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    addCustomRow: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    addCustomRowBorder: {
      marginTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
    },
    customInput: {
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.body,
    },
  });
