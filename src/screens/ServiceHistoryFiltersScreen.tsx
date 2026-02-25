import DateTimePicker from "@react-native-community/datetimepicker";
import { useLayoutEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { ServiceEntryCategory } from "../types/domain";
import { setPendingModalResult } from "../app/pendingModalResult";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { ModalButton } from "../ui/components/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

export type ServiceHistoryFiltersParams = {
  categoryFilter: "all" | ServiceEntryCategory;
  dateFrom: string;
  dateTo: string;
  minCost: string;
  maxCost: string;
  showReminders: boolean;
  sortOption:
    | "date-newest"
    | "date-oldest"
    | "title-az"
    | "title-za"
    | "cost-asc"
    | "cost-desc";
};

const CATEGORY_OPTIONS: ServiceEntryCategory[] = [
  "maintenance",
  "repair",
  "inspection",
  "upgrade",
  "oil_engine",
  "other",
];

type Props = NativeStackScreenProps<AppStackParamList, "ServiceHistoryFilters">;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(year, month - 1, day);
}

export function ServiceHistoryFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const params = route.params;
  const currency = settings?.currency ?? "PLN";

  const [categoryFilter, setCategoryFilter] = useState<
    "all" | ServiceEntryCategory
  >((params.categoryFilter as "all" | ServiceEntryCategory) ?? "all");
  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(params.dateTo ?? "");
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [minCost, setMinCost] = useState(params.minCost ?? "");
  const [maxCost, setMaxCost] = useState(params.maxCost ?? "");
  const [showReminders, setShowReminders] = useState(
    params.showReminders ?? false,
  );
  type SortOption =
    | "date-newest"
    | "date-oldest"
    | "title-az"
    | "title-za"
    | "cost-asc"
    | "cost-desc";
  const [sortOption, setSortOption] = useState<SortOption>(
    (params.sortOption as SortOption | undefined) ?? "date-newest",
  );

  const sortField = useMemo(() => {
    const [field] = sortOption.split("-") as [string, string];
    if (field === "title") return "title" as const;
    if (field === "cost") return "cost" as const;
    return "date" as const;
  }, [sortOption]);

  function setSortField(next: "date" | "title" | "cost") {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
    if (next === "cost") setSortOption("cost-asc");
  }

  function clearFilters() {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setShowReminders(false);
    setSortOption("date-newest");
    setOpenDatePicker(null);
  }

  function openPicker(kind: "from" | "to") {
    const current = kind === "from" ? dateFrom : dateTo;
    setDatePickerDraft(
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date())),
    );
    setOpenDatePicker(kind);
  }

  function cancelPicker() {
    setOpenDatePicker(null);
  }

  function confirmPicker() {
    if (!openDatePicker) return;
    const ymd = formatYmd(datePickerDraft);
    if (openDatePicker === "from") setDateFrom(ymd);
    if (openDatePicker === "to") setDateTo(ymd);
    setOpenDatePicker(null);
  }

  function renderInlineDatePicker() {
    return (
      <View
        style={[
          styles.pickerWrap,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <DateTimePicker
          value={datePickerDraft}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={
            Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
              ? "dark"
              : "light"
          }
          onChange={(event, selectedDate) => {
            if (Platform.OS === "ios") {
              if (selectedDate) setDatePickerDraft(selectedDate);
              return;
            }
            setOpenDatePicker(null);
            if ((event as any)?.type === "dismissed") return;
            if (!selectedDate) return;
            const ymd = formatYmd(selectedDate);
            if (openDatePicker === "from") setDateFrom(ymd);
            if (openDatePicker === "to") setDateTo(ymd);
          }}
        />
        {Platform.OS === "ios" ? (
          <View style={styles.pickerActionsRow}>
            <Pressable
              onPress={cancelPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.pickerActionText, { color: theme.colors.muted }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: accentBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerActionText,
                  { color: theme.colors.accent },
                ]}
              >
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function showCategoryPicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setCategoryFilter("all") },
      ...CATEGORY_OPTIONS.map((c) => ({
        text: t(`entryForm.categories.${c}` as any),
        onPress: () => setCategoryFilter(c),
      })),
    ];
    Alert.alert(t("timeline.filterCategory"), "", buttons, {
      cancelable: true,
    });
  }

  const categoryLabel =
    categoryFilter === "all"
      ? t("common.all")
      : t(`entryForm.categories.${categoryFilter}` as any);

  function applyFilters() {
    const applied: ServiceHistoryFiltersParams = {
      categoryFilter,
      dateFrom,
      dateTo,
      minCost,
      maxCost,
      showReminders,
      sortOption,
    };
    setPendingModalResult("serviceHistory", applied);
    navigation.goBack();
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("timeline.filtersTitle", { defaultValue: "Filters" }),
      headerBackVisible: false,
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTitleStyle: { color: theme.colors.fg },
      headerLeft: () => (
        <ModalButton onPress={() => navigation.goBack()}>
          {t("common.cancel")}
        </ModalButton>
      ),
      headerRight: () => (
        <ModalButton onPress={applyFilters}>{t("common.done")}</ModalButton>
      ),
    });
  }, [
    navigation,
    t,
    theme.colors.bg,
    theme.colors.fg,
    categoryFilter,
    dateFrom,
    dateTo,
    minCost,
    maxCost,
    showReminders,
    sortOption,
  ]);

  return (
    <FormScreen
      isModal
      footer={
        <Button variant="outlined" onPress={clearFilters}>
          {t("common.clearButton")}
        </Button>
      }
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
        <View style={styles.row}>
          <Ionicons
            name="notifications-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={[styles.valueText, { color: theme.colors.fg }]}>
            {t("timeline.showReminders")}
          </Text>
          <Switch
            value={showReminders}
            onValueChange={setShowReminders}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
            thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
          />
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Pressable
          onPress={showCategoryPicker}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
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
                  categoryFilter === "all"
                    ? theme.colors.muted
                    : theme.colors.fg,
              },
            ]}
          >
            {categoryLabel}
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
            {(["date", "title", "cost"] as const).map((f) => {
              const selected = sortField === f;
              const label =
                f === "date"
                  ? t("timeline.sortFieldDate")
                  : f === "title"
                    ? t("timeline.sortFieldTitle")
                    : t("timeline.sortFieldAmount");
              return (
                <Pressable
                  key={f}
                  onPress={() => setSortField(f)}
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
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="options-outline"
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
            {sortField === "date"
              ? (["newest", "oldest"] as const).map((o) => {
                  const selected = sortOption === `date-${o}`;
                  const label =
                    o === "newest"
                      ? t("timeline.sortOrderNewest")
                      : t("timeline.sortOrderOldest");
                  return (
                    <Pressable
                      key={o}
                      onPress={() =>
                        setSortOption(
                          o === "newest" ? "date-newest" : "date-oldest",
                        )
                      }
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
                        {label}
                      </Text>
                    </Pressable>
                  );
                })
              : sortField === "title"
                ? (["az", "za"] as const).map((o) => {
                    const selected = sortOption === `title-${o}`;
                    const label =
                      o === "az"
                        ? t("timeline.sortOrderAz")
                        : t("timeline.sortOrderZa");
                    return (
                      <Pressable
                        key={o}
                        onPress={() =>
                          setSortOption(o === "az" ? "title-az" : "title-za")
                        }
                        style={({ pressed }) => [
                          styles.segment,
                          selected && styles.segmentSelected,
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
                            styles.segmentTextSmall,
                            {
                              color: selected
                                ? theme.colors.accent
                                : theme.colors.muted,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })
                : (["asc", "desc"] as const).map((o) => {
                    const selected = sortOption === `cost-${o}`;
                    const label =
                      o === "asc"
                        ? t("timeline.sortOrderAmountAsc")
                        : t("timeline.sortOrderAmountDesc");
                    return (
                      <Pressable
                        key={o}
                        onPress={() =>
                          setSortOption(o === "asc" ? "cost-asc" : "cost-desc")
                        }
                        style={({ pressed }) => [
                          styles.segment,
                          selected && styles.segmentSelected,
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
                            styles.segmentTextSmall,
                            {
                              color: selected
                                ? theme.colors.accent
                                : theme.colors.muted,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
          </View>
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Pressable
          onPress={() => openPicker("from")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text
            style={[
              styles.valueText,
              { color: dateFrom ? theme.colors.fg : theme.colors.muted },
            ]}
          >
            {dateFrom || t("timeline.filterFrom")}
          </Text>
        </Pressable>
        {openDatePicker === "from" ? (
          <>
            {renderInlineDatePicker()}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </>
        ) : (
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
        )}

        <Pressable
          onPress={() => openPicker("to")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text
            style={[
              styles.valueText,
              { color: dateTo ? theme.colors.fg : theme.colors.muted },
            ]}
          >
            {dateTo || t("timeline.filterTo")}
          </Text>
        </Pressable>
        {openDatePicker === "to" ? (
          <>
            {renderInlineDatePicker()}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </>
        ) : null}

        <View style={styles.row}>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={minCost}
            onChangeText={setMinCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMinCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={maxCost}
            onChangeText={setMaxCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMaxCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </View>
      </View>
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
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
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
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
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
