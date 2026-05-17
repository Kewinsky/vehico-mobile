import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { ModalLayout } from "../../layouts";
import type { UserSettings } from "../../app/providers/UserSettingsProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { Card, CardRow } from "../../ui/components/common/Card";
import {
  UNIT_GROUPS,
  resolveUnitGroupId,
  settingsPatchForUnitGroup,
  type UnitGroupId,
} from "../../utils/unitGroups";

type Props = NativeStackScreenProps<AppStackParamList, "Appearance">;

type Option<V extends string> = { value: V; label: string };

type SettingItem = {
  key: "currency" | "theme" | "language";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  options: Option<string>[];
};

function capitalizeFirst(value: string): string {
  if (!value.length) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildCardConfig(t: TFunction): Array<{
  cardLabelKey: string;
  items: SettingItem[];
  unitGroup?: boolean;
}> {
  return [
    {
      cardLabelKey: "settings.tabUnits",
      items: [
        {
          key: "currency",
          icon: "cash-outline",
          labelKey: "settings.currency",
          options: [
            { value: "PLN", label: capitalizeFirst("PLN") },
            { value: "USD", label: capitalizeFirst("USD") },
          ],
        },
      ],
      unitGroup: true,
    },
    {
      cardLabelKey: "settings.tabDisplay",
      items: [
        {
          key: "theme",
          icon: "sunny-outline",
          labelKey: "settings.theme",
          options: [
            { value: "light", label: capitalizeFirst(t("settings.themeLight")) },
            { value: "dark", label: capitalizeFirst(t("settings.themeDark")) },
          ],
        },
        {
          key: "language",
          icon: "language-outline",
          labelKey: "settings.language",
          options: [
            { value: "pl", label: capitalizeFirst("PL") },
            { value: "en", label: capitalizeFirst("EN") },
          ],
        },
      ],
    },
  ];
}

export function AppearanceScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings, setSettings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cardConfig = useMemo(() => buildCardConfig(t), [t]);

  async function pick<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    try {
      await setSettings({ [key]: value } as Partial<UserSettings>);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function pickUnitGroup(groupId: UnitGroupId) {
    try {
      await setSettings(settingsPatchForUnitGroup(groupId));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  function unitGroupTitle(groupId: UnitGroupId): string {
    return t(`settings.unitGroups.${groupId}.title`, {
      units: t(`settings.unitGroups.${groupId}.units`),
    });
  }

  function showPicker<V extends string>(opts: {
    title: string;
    value: V;
    options: readonly Option<V>[];
    onChange: (value: V) => void;
  }) {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }> = [{ text: t("common.cancel"), style: "cancel" }];

    opts.options.forEach((opt) => {
      buttons.push({
        text: opt.label,
        onPress: () => opts.onChange(opt.value),
      });
    });

    Alert.alert(opts.title, t("common.chooseOption"), buttons, {
      cancelable: true,
    });
  }

  function openUnitGroupAlert() {
    if (!settings) return;
    showPicker({
      title: t("settings.unitGroupSection"),
      value: resolveUnitGroupId(settings),
      options: UNIT_GROUPS.map((group) => ({
        value: group.id,
        label: unitGroupTitle(group.id),
      })),
      onChange: (groupId) => void pickUnitGroup(groupId),
    });
  }

  const themeIcon: React.ComponentProps<typeof Ionicons>["name"] =
    mode === "dark" ? "moon-outline" : "sunny-outline";

  function labelForSetting(
    value: string,
    options: readonly Option<string>[],
  ): string {
    const match = options.find((opt) => opt.value === value);
    return match?.label ?? value;
  }

  return (
    <ModalLayout
      title={t("settings.appearanceButton")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      loading={!settings}
      useNativeHeaderScrollView
    >
      {settings && (
        <View style={styles.container}>
          {cardConfig.map(({ cardLabelKey, items, unitGroup }) => (
            <View key={cardLabelKey} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
                {t(cardLabelKey)}
              </Text>
              <Card>
                {items.map(({ key, icon, labelKey, options }) => {
                  const currentIcon = key === "theme" ? themeIcon : icon;
                  const value = String(settings[key]);
                  const displayValue = labelForSetting(value, options);

                  return (
                    <Pressable
                      key={String(key)}
                      onPress={() =>
                        showPicker({
                          title: t(labelKey),
                          value,
                          options,
                          onChange: (next) =>
                            void pick(key, next as UserSettings[typeof key]),
                        })
                      }
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <CardRow>
                        <View style={styles.rowLeft}>
                          <Ionicons
                            name={currentIcon}
                            size={20}
                            color={theme.colors.accent}
                          />
                          <Text
                            style={[styles.label, { color: theme.colors.muted }]}
                            numberOfLines={1}
                          >
                            {t(labelKey)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.valueText,
                            { color: theme.colors.fg, textAlign: "right" },
                          ]}
                          numberOfLines={2}
                        >
                          {displayValue}
                        </Text>
                      </CardRow>
                    </Pressable>
                  );
                })}
                {unitGroup ? (
                  <Pressable
                    onPress={openUnitGroupAlert}
                    style={({ pressed }) => [
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <CardRow>
                      <View style={styles.rowLeft}>
                        <Ionicons
                          name="speedometer-outline"
                          size={20}
                          color={theme.colors.accent}
                        />
                        <Text
                          style={[styles.label, { color: theme.colors.muted }]}
                          numberOfLines={1}
                        >
                          {t("settings.unitGroupSection")}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.valueText,
                          { color: theme.colors.fg, textAlign: "right" },
                        ]}
                        numberOfLines={2}
                      >
                        {unitGroupTitle(resolveUnitGroupId(settings))}
                      </Text>
                    </CardRow>
                  </Pressable>
                ) : null}
              </Card>
            </View>
          ))}

          <View style={styles.bottomSpacer} />
        </View>
      )}
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.sm,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
