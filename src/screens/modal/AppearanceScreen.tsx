import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { ModalLayout } from "../../layouts";
import { useHeaderHeight } from "@react-navigation/elements";
import type { UserSettings } from "../../app/providers/UserSettingsProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError } from "../../ui/toast/toast";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";

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
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings, setSettings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
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
    >
      {settings && (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: headerHeight }]}
        >
          {cardConfig.map(({ cardLabelKey, items }) => (
            <View
              key={cardLabelKey}
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
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
                    <View
                      style={[
                        styles.tabsWrap,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.bg,
                        },
                      ]}
                    >
                      {options.map((opt) => {
                        const selected = value === opt.value;
                        return (
                          <Pressable
                            key={String(opt.value)}
                            onPress={() => void pick(key, opt.value)}
                            style={({ pressed }) => [
                              styles.tab,
                              selected && styles.tabSelected,
                              {
                                borderColor: theme.colors.accent,
                                backgroundColor: selected
                                  ? accentBg
                                  : "transparent",
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tabText,
                                {
                                  color: selected
                                    ? theme.colors.accent
                                    : theme.colors.muted,
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    cardTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.sm,
    },
    row: {
      paddingVertical: theme.spacing.sm,
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
    tabsWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 2,
    },
    tab: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    tabSelected: {
      borderWidth: 1,
    },
    tabText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
