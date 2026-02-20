import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Workshop, WorkshopType } from "../types/domain";
import { listWorkshops } from "../services/workshops/workshopsRepo";
import { AppNavbar } from "../ui/components/AppNavbar";
import { AppLayout } from "../ui/components/AppLayout";
import { ContentHeader } from "../ui/components/ContentHeader";
import { CustomFlatList } from "../ui/components/CustomFlatList";
import { EmptyState } from "../ui/components/EmptyState";
import { TimelineItem } from "../ui/components/TimelineItem";
import { useTheme } from "../ui/ThemeProvider";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { toastError } from "../ui/toast/toast";
import { useEntitlements } from "../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Workshops">;

export function WorkshopsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");
  const {
    isPremium,
    workshopsLimit,
    freePlanWorkshopIds,
    refresh: refreshEntitlements,
  } = useEntitlements();

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading !== false;
      try {
        if (showLoading) setLoading(true);
        const options = isPremium ? undefined : { freePlanWorkshopIds };
        const data = await listWorkshops(options);
        setItems(data);
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t, isPremium, workshopsLimit, freePlanWorkshopIds],
  );

  const loadRef = useRef(load);
  loadRef.current = load;
  const refreshEntitlementsRef = useRef(refreshEntitlements);
  refreshEntitlementsRef.current = refreshEntitlements;

  useEffect(() => {
    void load({ showLoading: false });
    const unsub = navigation.addListener("focus", () => {
      void refreshEntitlementsRef.current?.().then(() => {
        setTimeout(() => loadRef.current?.({ showLoading: false }), 0);
      });
    });
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

  const hasActiveFilters = typeFilter !== "all" || sortOrder !== "az";

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

  function showTypePicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("workshops.typeAll"), onPress: () => setTypeFilter("all") },
      ...WORKSHOP_TYPES.filter((x) => x !== "all").map((tp) => ({
        text: getWorkshopTypeLabel(tp),
        onPress: () => setTypeFilter(tp),
      })),
    ];
    Alert.alert(t("workshops.filterByType"), "", buttons, { cancelable: true });
  }

  function onAddWorkshopPress() {
    if (!isPremium && items.length >= workshopsLimit) {
      Alert.alert(
        t("limits.workshopLimitReachedTitle"),
        t("limits.workshopLimitReachedBody", { limit: workshopsLimit }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("WorkshopForm", {});
  }

  const filterPanelContent = (
    <>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBarWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.muted}
            style={styles.searchBarIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("workshops.searchPlaceholder")}
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            style={[styles.searchBarInput, { color: theme.colors.fg }]}
          />
        </View>
        <View style={styles.panelButtonsRow}>
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
              onPress={onAddWorkshopPress}
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
              hasActiveFilters && { borderColor: theme.colors.accent },
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
                color={hasActiveFilters ? theme.colors.accent : theme.colors.fg}
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
        <>
          <View style={{ height: theme.spacing.sm }} />
          <View
            style={[
              styles.filtersCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Pressable
              onPress={showTypePicker}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.valueText,
                  {
                    color:
                      typeFilter === "all"
                        ? theme.colors.muted
                        : theme.colors.fg,
                  },
                ]}
                numberOfLines={1}
              >
                {typeFilter === "all"
                  ? t("workshops.filterByType")
                  : getWorkshopTypeLabel(typeFilter)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.accent}
              />
            </Pressable>

            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color={theme.colors.accent}
              />
              <View
                style={[
                  styles.segmentWrap,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.bg,
                  },
                ]}
              >
                {(["az", "za"] as const).map((opt) => {
                  const selected = sortOrder === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSortOrder(opt)}
                      style={({ pressed }) => [
                        styles.segment,
                        selected && styles.segmentSelected,
                        {
                          borderColor: theme.colors.accent,
                          backgroundColor: selected ? accentBg : "transparent",
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentTextSmall,
                          {
                            color: selected
                              ? theme.colors.accent
                              : theme.colors.muted,
                          },
                        ]}
                      >
                        {opt === "az"
                          ? t("workshops.sortAz")
                          : t("workshops.sortZa")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </>
      ) : null}
    </>
  );

  return (
    <AppLayout
      loading={loading}
      header={
        <AppNavbar
          onBack={() => navigation.goBack()}
          showShopIcon={!isPremium}
          onShopPress={() => navigation.navigate("Shop")}
        />
      }
    >
      <CustomFlatList<Workshop>
        data={filtered}
        listHeaderComponent={
          <ContentHeader
            title={t("workshops.title")}
            filterPanel={filterPanelContent}
          />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TimelineItem
            title={item.name}
            subtitle={item.address ?? undefined}
            onPress={() =>
              navigation.navigate("WorkshopForm", { workshopId: item.id })
            }
          />
        )}
        ListEmptyComponent={<EmptyState body={t("workshops.noWorkshops")} />}
      />
    </AppLayout>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    panelButtonsRow: {
      marginLeft: theme.spacing.xs,
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    searchBarWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      height: theme.spacing.lg * 2,
      paddingLeft: theme.spacing.sm,
    },
    searchBarIcon: {
      marginRight: theme.spacing.xs,
    },
    searchBarInput: {
      flex: 1,
      height: "100%",
      paddingVertical: 0,
      fontSize: theme.typography.body,
    },
    addButton: {
      width: theme.spacing.xl + theme.spacing.sm,
      height: theme.spacing.xl + theme.spacing.sm,
      borderRadius: theme.radius.md,
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
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    segmentWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 2,
    },
    segment: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentSelected: { borderWidth: 1 },
    segmentTextSmall: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    divider: { height: 1, width: "100%" },
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    card: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: theme.spacing.sm,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cardSubtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs,
    },
  });
}
