import { StyleSheet, Text, View } from "react-native";
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
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";

type Props = NativeStackScreenProps<AppStackParamList, "Appearance">;

type Option<V> = { value: V; label: string };

type SettingItem = {
  key: keyof UserSettings;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  options: Option<UserSettings[keyof UserSettings]>[];
};

function buildCardConfig(t: TFunction): Array<{
  cardLabelKey: string;
  items: SettingItem[];
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
            { value: "PLN", label: "PLN" },
            { value: "EUR", label: "EUR" },
          ],
        },
        {
          key: "distanceUnit",
          icon: "speedometer-outline",
          labelKey: "settings.distanceUnit",
          options: [
            { value: "km", label: t("settings.distanceUnitKm") },
            { value: "miles", label: t("settings.distanceUnitMiles") },
          ],
        },
        {
          key: "fuelUnit",
          icon: "water-outline",
          labelKey: "settings.fuelUnit",
          options: [
            { value: "liters", label: t("settings.fuelUnitLiters") },
            { value: "gallons", label: t("settings.fuelUnitGallons") },
          ],
        },
      ],
    },
    {
      cardLabelKey: "settings.tabDisplay",
      items: [
        {
          key: "theme",
          icon: "sunny-outline",
          labelKey: "settings.theme",
          options: [
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ],
        },
        {
          key: "language",
          icon: "language-outline",
          labelKey: "settings.language",
          options: [
            { value: "pl", label: "PL" },
            { value: "en", label: "EN" },
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

  const themeIcon: React.ComponentProps<typeof Ionicons>["name"] =
    mode === "dark" ? "moon-outline" : "sunny-outline";

  return (
    <ModalLayout
      title={t("settings.appearanceButton")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      loading={!settings}
      useNativeHeaderScrollView
    >
      {settings && (
        <View style={styles.container}>
          {cardConfig.map(({ cardLabelKey, items }) => (
            <View key={cardLabelKey} style={[styles.card]}>
              <Text style={[styles.cardTitle, { color: theme.colors.fg }]}>
                {t(cardLabelKey)}
              </Text>
              {items.map(({ key, icon, labelKey, options }) => {
                const currentIcon = key === "theme" ? themeIcon : icon;
                const value = settings[key];
                return (
                  <View key={key} style={[styles.row]}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons
                        name={currentIcon}
                        size={20}
                        color={theme.colors.accent}
                      />
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {t(labelKey)}
                      </Text>
                    </View>
                    <SegmentTabs
                      value={value as any}
                      options={options as any}
                      onChange={(next) => void pick(key as any, next as any)}
                      size="md"
                    />
                  </View>
                );
              })}
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
    loadingWrap: {
      flex: 1,
      paddingTop: theme.spacing.xl,
      alignItems: "center",
    },
    largeTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      marginVertical: theme.spacing.md,
    },
    card: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    cardTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.sm,
    },
    row: {
      paddingVertical: theme.spacing.md,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    sectionLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
