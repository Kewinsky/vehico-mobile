import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
import { ChoiceChip } from "../ui/components/ChoiceChip";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const data = await listWorkshops();
        setItems(data);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener(
      "focus",
      () => void load({ showLoading: false })
    );
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
          (w.address ?? "").toLowerCase().includes(q)
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

  const hasActiveFilters = typeFilter !== "all";

  function resetFilters() {
    setTypeFilter("all");
    setSortOrder("az");
  }

  const WORKSHOP_TYPES: (WorkshopType | "all")[] = [
    "all",
    "mechanic",
    "electrician",
    "detailer",
    "bodywork",
    "car_wash",
    "other",
  ];

  if (loading) {
    return (
      <Screen padding={false}>
        <AppHeader onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={[styles.fixedHeader, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>
            {t("workshops.title")}
          </Text>
        </View>
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
            style={{
              marginLeft: theme.spacing.sm,
              flexDirection: "row",
              gap: theme.spacing.sm,
            }}
          >
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
            <View
              style={[
                styles.addButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
                hasActiveFilters && {
                  borderColor: theme.colors.accent,
                },
              ]}
            >
              <Pressable
                onPress={() => setFiltersOpen((v) => !v)}
                style={({ pressed }) => [
                  styles.addButtonInner,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="filter-outline"
                  size={24}
                  color={
                    hasActiveFilters ? theme.colors.accent : theme.colors.fg
                  }
                />
              </Pressable>
            </View>
            {hasActiveFilters ? (
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
                  onPress={resetFilters}
                  style={({ pressed }) => [
                    styles.addButtonInner,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={24}
                    color={theme.colors.fg}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
        {filtersOpen ? (
          <View
            style={[
              styles.filtersCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Text style={[styles.filterLabel, { color: theme.colors.muted }]}>
              {t("workshops.filterByType")}
            </Text>
            <View style={[styles.filterRow, { flexWrap: "wrap" }]}>
              {WORKSHOP_TYPES.map((type) => (
                <ChoiceChip
                  key={type}
                  label={
                    type === "all"
                      ? t("workshops.typeAll")
                      : getWorkshopTypeLabel(type)
                  }
                  selected={typeFilter === type}
                  onPress={() => setTypeFilter(type)}
                  style={styles.filterChoiceType}
                />
              ))}
            </View>
            <Text
              style={[
                styles.filterLabel,
                { color: theme.colors.muted, marginTop: theme.spacing.sm },
              ]}
            >
              {t("workshops.sortBy")}
            </Text>
            <View style={styles.filterRow}>
              <ChoiceChip
                label={t("workshops.sortAz")}
                selected={sortOrder === "az"}
                onPress={() => setSortOrder("az")}
                style={styles.filterChoice}
              />
              <ChoiceChip
                label={t("workshops.sortZa")}
                selected={sortOrder === "za"}
                onPress={() => setSortOrder("za")}
                style={styles.filterChoice}
              />
            </View>
          </View>
        ) : null}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
        }}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.colors.muted,
              marginTop: theme.spacing.xs,
              fontSize: theme.typography.small,
            }}
          >
            {t("workshops.noWorkshops")}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("WorkshopDetail", { workshopId: item.id })
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.cardTitle, { color: theme.colors.fg }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {getWorkshopTypeLabel(item.workshop_type)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.muted}
                />
              </View>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    fixedHeader: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      backgroundColor: theme.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    header: {
      gap: theme.spacing.xs / 2,
      marginBottom: theme.titleMarginBottom,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    addButton: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    filtersCard: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    filterLabel: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    filterRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs / 2,
    },
    filterChoice: {
      flex: 1,
    },
    filterChoiceType: {
      marginBottom: theme.spacing.xs / 2,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
    cardSubtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
    cardPhone: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
  });
}
