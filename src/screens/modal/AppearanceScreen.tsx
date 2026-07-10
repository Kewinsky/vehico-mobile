import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";

import { ModalLayout } from "../../layouts";
import type { UserSettings } from "../../core/providers/UserSettingsProvider";
import { useUserSettings } from "../../core/providers/UserSettingsProvider";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { Card } from "../../ui/components/common/Card";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";
import { APP_CURRENCY_OPTIONS } from "../../utils/currencies";
import {
  UNIT_GROUPS,
  resolveUnitGroupId,
  settingsPatchForUnitGroup,
  type UnitGroupId,
} from "../../utils/unitGroups";

type Option<V extends string> = { value: V; label: string };

type SettingItem = {
  key: "currency" | "theme" | "language";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  options: Option<string>[];
};

function buildCardConfig(t: TFunction): {
  cardLabelKey: string;
  items: SettingItem[];
  unitGroup?: boolean;
}[] {
  return [
    {
      cardLabelKey: "settings.tabUnits",
      items: [
        {
          key: "currency",
          icon: "cash-outline",
          labelKey: "settings.currency",
          options: [...APP_CURRENCY_OPTIONS],
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
            { value: "system", label: t("settings.themeSystem") },
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ],
        },
        {
          key: "language",
          icon: "language-outline",
          labelKey: "settings.language",
          options: [
            { value: "pl", label: t("settings.languagePl") },
            { value: "en", label: t("settings.languageEn") },
          ],
        },
      ],
    },
  ];
}

export function AppearanceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings, setSettings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cardConfig = useMemo(() => buildCardConfig(t), [t]);

  const unitGroupIds = useMemo(
    () => UNIT_GROUPS.map((group) => group.id),
    [],
  );

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

  const themeIcon: React.ComponentProps<typeof Ionicons>["name"] =
    settings?.theme === "system"
      ? "phone-portrait-outline"
      : mode === "dark"
        ? "moon-outline"
        : "sunny-outline";

  return (
    <ModalLayout
      title={t("settings.appearanceButton")}
      cancel={{ onPress: () => router.back(), label: t("common.cancel") }}
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
                  const optionValues = options.map((option) => option.value);

                  return (
                    <FormPickerRow<string>
                      key={String(key)}
                      icon={currentIcon}
                      label={t(labelKey)}
                      value={value}
                      options={optionValues}
                      getLabel={(optionValue) =>
                        options.find((option) => option.value === optionValue)
                          ?.label ?? optionValue
                      }
                      onChange={(next) =>
                        void pick(key, next as UserSettings[typeof key])
                      }
                    />
                  );
                })}
                {unitGroup ? (
                  <FormPickerRow<UnitGroupId>
                    icon="speedometer-outline"
                    label={t("settings.unitGroupSection")}
                    value={resolveUnitGroupId(settings)}
                    options={unitGroupIds}
                    getLabel={unitGroupTitle}
                    onChange={(groupId) => {
                      if (groupId) void pickUnitGroup(groupId);
                    }}
                  />
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
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
