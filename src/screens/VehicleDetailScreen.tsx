import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ServiceEntry } from "../types/domain";
import { listServiceEntries } from "../services/serviceEntries/serviceEntriesRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { TimelineItem } from "../ui/components/TimelineItem";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleDetail">;

function formatDate(iso: string) {
  // Keep simple (trustworthy, document-like): YYYY-MM-DD
  return iso.slice(0, 10);
}

export function VehicleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;
  const [items, setItems] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const distanceUnit = settings?.distanceUnit ?? "km";
  const currency = settings?.currency ?? "PLN";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listServiceEntries(vehicleId);
      setItems(data);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    // Run once on mount (avoids getting stuck in loading=true if focus event doesn't fire)
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const footer = useMemo(() => {
    return (
      <View style={{ paddingTop: 14 }}>
        <Button
          onPress={() => navigation.navigate("ServiceEntryForm", { vehicleId })}
        >
          {t("timeline.addEntry")}
        </Button>
      </View>
    );
  }, [navigation, t, vehicleId]);

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {t("dashboard.tiles.serviceTitle")}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.colors.fg }]}>
                {t("timeline.emptyTitle")}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.colors.muted }]}>
                {t("timeline.emptyBody")}
              </Text>
              <View style={{ height: 16 }} />
              <Button
                onPress={() =>
                  navigation.navigate("ServiceEntryForm", { vehicleId })
                }
              >
                {t("timeline.addEntry")}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            onPress={() =>
              navigation.navigate("ServiceEntryDetail", {
                entryId: item.id,
                vehicleId,
              })
            }
          >
            <TimelineItem
              dateLabel={formatDate(item.service_date)}
              title={item.title}
              subtitle={[
                item.mileage
                  ? `${item.mileage.toLocaleString()} ${distanceUnit}`
                  : null,
                item.cost != null ? `${item.cost} ${currency}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={footer}
      />
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    list: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingBottom: 12,
      gap: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { fontSize: 22, fontWeight: "800", color: theme.colors.fg },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    empty: {
      paddingTop: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    emptyBody: {
      marginTop: 8,
      lineHeight: 22,
      color: theme.colors.muted,
    },
  });
