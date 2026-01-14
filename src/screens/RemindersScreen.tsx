import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useCallback, useEffect, useState } from "react";
import type { Reminder } from "../types/domain";
import {
  deleteReminder,
  listReminders,
} from "../services/reminders/remindersRepo";
import { Button } from "../ui/components/Button";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Reminders">;

export function RemindersScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const distanceUnit = settings?.distanceUnit ?? "km";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listReminders(route.params.vehicleId);
      setItems(data);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [route.params.vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  function confirmDelete(id: string) {
    Alert.alert(t("reminders.deleteTitle"), t("reminders.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(id);
            setItems((prev) => prev.filter((x) => x.id !== id));
          } catch (err: any) {
            Alert.alert(t("common.error"), err?.message ?? String(err));
          }
        },
      },
    ]);
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
          {t("reminders.title")}
        </Text>

        <View style={{ height: 12 }} />
        <Button
          onPress={() =>
            navigation.navigate("ReminderForm", {
              vehicleId: route.params.vehicleId,
            })
          }
        >
          {t("reminders.add")}
        </Button>

        <View style={{ height: 14 }} />
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          refreshing={loading}
          onRefresh={load}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    navigation.navigate("ReminderForm", {
                      vehicleId: route.params.vehicleId,
                      reminderId: item.id,
                    })
                  }
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "800" }}>
                    {item.note ?? ""}
                  </Text>
                  <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                    {item.type === "time"
                      ? t("reminders.dueTime", { date: item.due_date ?? "" })
                      : t("reminders.dueMileage", {
                          mileage: item.due_mileage ?? "",
                          unit: distanceUnit,
                        })}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item.id)}
                  hitSlop={10}
                  style={styles.trash}
                >
                  <Text
                    style={{ color: theme.colors.danger, fontWeight: "900" }}
                  >
                    🗑
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                {t("reminders.noItems")}
              </Text>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800" },
  body: { marginTop: 8, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trash: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
