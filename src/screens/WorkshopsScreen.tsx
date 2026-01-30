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
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Workshop, WorkshopType } from "../types/domain";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Screen } from "../ui/components/Screen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Workshops">;

export function WorkshopsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listWorkshops();
      setItems(data);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    const unsub = navigation.addListener("focus", () => void load());
    return unsub;
  }, [navigation, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (typeFilter !== "all") {
      list = list.filter((w) => w.workshop_type === typeFilter);
    }
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.phone_number ?? "").toLowerCase().includes(q) ||
          (w.address ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return sortOrder === "az" ? cmp : -cmp;
    });
    return sorted;
  }, [items, query, typeFilter, sortOrder]);

  function getWorkshopTypeLabel(type: string): string {
    return t(`workshopForm.types.${type}`);
  }

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <LoadingIndicator />
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.header, { paddingHorizontal: theme.spacing.md }]}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("workshops.title")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t("dashboard.tiles.workshopsSubtitle")}
        </Text>
        <View style={{ height: theme.spacing.sm }} />
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <TextField
              noMarginTop
              value={query}
              onChangeText={setQuery}
              placeholder={t("workshops.searchPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <View
            style={[
              styles.addButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() => navigation.navigate("WorkshopForm", {})}
              style={({ pressed }) => [
                styles.addButtonInner,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="add" size={24} color={theme.colors.fg} />
            </Pressable>
          </View>
        </View>
        <View style={{ height: theme.spacing.sm }} />
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => {
              const types: (WorkshopType | "all")[] = [
                "all",
                "mechanic",
                "electrician",
                "detailer",
                "bodywork",
                "car_wash",
                "other",
              ];
              Alert.alert(
                t("workshops.filterByType"),
                "",
                [
                  { text: t("common.cancel"), style: "cancel" },
                  ...types.map((type) => ({
                    text:
                      type === "all"
                        ? t("workshops.typeAll")
                        : getWorkshopTypeLabel(type),
                    onPress: () => setTypeFilter(type),
                  })),
                ],
                { cancelable: true },
              );
            }}
            style={({ pressed }) => [
              styles.filterChip,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[styles.filterChipText, { color: theme.colors.fg }]}
              numberOfLines={1}
            >
              {typeFilter === "all"
                ? t("workshops.typeAll")
                : getWorkshopTypeLabel(typeFilter)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={theme.colors.muted}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
          <View style={styles.sortRow}>
            <Text style={[styles.sortLabel, { color: theme.colors.muted }]}>
              {t("workshops.sortBy")}:
            </Text>
            <Pressable
              onPress={() => setSortOrder("az")}
              style={({ pressed }) => [
                styles.sortChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor:
                    sortOrder === "az"
                      ? theme.colors.accent + "20"
                      : theme.colors.card,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.sortChipText,
                  {
                    color:
                      sortOrder === "az"
                        ? theme.colors.accent
                        : theme.colors.fg,
                    fontWeight: sortOrder === "az" ? "700" : "500",
                  },
                ]}
              >
                {t("workshops.sortAz")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSortOrder("za")}
              style={({ pressed }) => [
                styles.sortChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor:
                    sortOrder === "za"
                      ? theme.colors.accent + "20"
                      : theme.colors.card,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.sortChipText,
                  {
                    color:
                      sortOrder === "za"
                        ? theme.colors.accent
                        : theme.colors.fg,
                    fontWeight: sortOrder === "za" ? "700" : "500",
                  },
                ]}
              >
                {t("workshops.sortZa")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: theme.colors.muted }}>
              {t("workshops.noWorkshops")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("WorkshopDetail", { workshopId: item.id })
            }
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.fg }]}>
              {item.name}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.muted }]}>
              {getWorkshopTypeLabel(item.workshop_type)}
            </Text>
            {item.phone_number ? (
              <Text
                style={[styles.cardPhone, { color: theme.colors.accent }]}
                numberOfLines={1}
              >
                {item.phone_number}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    header: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: 14,
      marginTop: theme.spacing.xs,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonInner: {
      padding: theme.spacing.sm,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      maxWidth: "50%",
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: "500",
    },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    sortLabel: {
      fontSize: 14,
    },
    sortChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
    },
    sortChipText: {
      fontSize: 14,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    cardSubtitle: {
      fontSize: 14,
      marginTop: theme.spacing.xs,
    },
    cardPhone: {
      fontSize: 14,
      marginTop: theme.spacing.xs,
    },
    empty: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    },
  });
}
