import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import type { UserSettings } from "../app/providers/UserSettingsProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings, setSettings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
        }}
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("settings.title")}
        </Text>

        {!settings ? (
          <View style={{ paddingTop: theme.spacing.lg, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View
            style={[
              styles.box,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Text style={[styles.section, { color: theme.colors.muted }]}>
              {t("settings.currency")}
            </Text>
            <View style={styles.row}>
              {(["PLN", "EUR"] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => void pick("currency", c)}
                  style={[
                    styles.choice,
                    { borderColor: theme.colors.border },
                    settings?.currency === c && {
                      borderColor: theme.colors.fg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        settings?.currency === c
                          ? theme.colors.fg
                          : theme.colors.muted,
                      fontWeight: "800",
                    }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: theme.spacing.sm }} />
            <Text style={[styles.section, { color: theme.colors.muted }]}>
              {t("settings.distanceUnit")}
            </Text>
            <View style={styles.row}>
              {(["km", "miles"] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => void pick("distanceUnit", u)}
                  style={[
                    styles.choice,
                    { borderColor: theme.colors.border },
                    settings?.distanceUnit === u && {
                      borderColor: theme.colors.fg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        settings?.distanceUnit === u
                          ? theme.colors.fg
                          : theme.colors.muted,
                      fontWeight: "800",
                    }}
                  >
                    {u === "km"
                      ? t("settings.distanceUnitKm")
                      : t("settings.distanceUnitMiles")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: theme.spacing.sm }} />
            <Text style={[styles.section, { color: theme.colors.muted }]}>
              {t("settings.fuelUnit")}
            </Text>
            <View style={styles.row}>
              {(["liters", "gallons"] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => void pick("fuelUnit", u)}
                  style={[
                    styles.choice,
                    { borderColor: theme.colors.border },
                    settings?.fuelUnit === u && {
                      borderColor: theme.colors.fg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        settings?.fuelUnit === u
                          ? theme.colors.fg
                          : theme.colors.muted,
                      fontWeight: "800",
                    }}
                  >
                    {u === "liters"
                      ? t("settings.fuelUnitLiters")
                      : t("settings.fuelUnitGallons")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: theme.spacing.sm }} />
            <Text style={[styles.section, { color: theme.colors.muted }]}>
              {t("settings.theme")}
            </Text>
            <View style={styles.row}>
              {(["light", "dark"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => void pick("theme", m)}
                  style={[
                    styles.choice,
                    { borderColor: theme.colors.border },
                    settings?.theme === m && { borderColor: theme.colors.fg },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        settings?.theme === m
                          ? theme.colors.fg
                          : theme.colors.muted,
                      fontWeight: "800",
                    }}
                  >
                    {m === "light"
                      ? t("settings.themeLight")
                      : t("settings.themeDark")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: theme.spacing.sm }} />
            <Text style={[styles.section, { color: theme.colors.muted }]}>
              {t("settings.language")}
            </Text>
            <View style={styles.row}>
              {(["pl", "en"] as const).map((lng) => (
                <Pressable
                  key={lng}
                  onPress={() => void pick("language", lng)}
                  style={[
                    styles.choice,
                    { borderColor: theme.colors.border },
                    settings?.language === lng && {
                      borderColor: theme.colors.fg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        settings?.language === lng
                          ? theme.colors.fg
                          : theme.colors.muted,
                      fontWeight: "800",
                    }}
                  >
                    {lng.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    title: { fontSize: 20, fontWeight: "800" },
    body: { marginTop: theme.spacing.xs, lineHeight: 22 },
    box: {
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    section: { fontWeight: "800" },
    // Two-column grid (wraps as needed).
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
      marginTop: theme.spacing.xs,
    },
    choice: {
      borderWidth: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.sm,
      width: "48%",
      alignItems: "center",
    },
  });
