import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { ServiceEntryCategory } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { ModalFormScreen } from "../../ui/components/layout/ModalFormScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";
import { InlineDatePicker } from "../../ui/components/common/InlineDatePicker";

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
  "oil_change",
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

  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const sortField = useMemo(() => {
    const [field] = sortOption.split("-") as [string, string];
    if (field === "title") return "title" as const;
    if (field === "cost") return "cost" as const;
    return "date" as const;
  }, [sortOption]);
  const dateSortOption =
    sortOption === "date-oldest" ? "date-oldest" : "date-newest";
  const titleSortOption = sortOption === "title-za" ? "title-za" : "title-az";
  const costSortOption = sortOption === "cost-desc" ? "cost-desc" : "cost-asc";

  function setSortField(next: "date" | "title" | "cost") {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
    if (next === "cost") setSortOption("cost-asc");
  }

  function setDateSortOption(next: "date-newest" | "date-oldest") {
    setSortOption(next);
  }

  function setTitleSortOption(next: "title-az" | "title-za") {
    setSortOption(next);
  }

  function setCostSortOption(next: "cost-asc" | "cost-desc") {
    setSortOption(next);
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

  return (
    <ModalFormScreen
      title={t("timeline.filtersTitle", { defaultValue: "Filters" })}
      onCancel={() => navigation.goBack()}
      onDone={applyFilters}
      cancelLabel={t("common.cancel")}
      doneLabel={t("common.done")}
      footer={
        <Button variant="outlined" onPress={clearFilters}>
          {t("common.clearButton")}
        </Button>
      }
    >
      <Card>
        <CardRow>
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
          />
        </CardRow>
        <Pressable
          onPress={showCategoryPicker}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
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
          </CardRow>
        </Pressable>
        <CardRow>
          <Ionicons
            name="swap-vertical-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            <SegmentTabs<"date" | "title" | "cost">
              value={sortField}
              options={[
                { value: "date", label: t("timeline.sortFieldDate") },
                { value: "title", label: t("timeline.sortFieldTitle") },
                { value: "cost", label: t("timeline.sortFieldAmount") },
              ]}
              onChange={setSortField}
              size="sm"
            />
          </View>
        </CardRow>
        <CardRow>
          <Ionicons
            name="options-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            {sortField === "date" ? (
              <SegmentTabs<"date-newest" | "date-oldest">
                value={dateSortOption}
                options={[
                  {
                    value: "date-newest",
                    label: t("timeline.sortOrderNewest"),
                  },
                  {
                    value: "date-oldest",
                    label: t("timeline.sortOrderOldest"),
                  },
                ]}
                onChange={setDateSortOption}
                size="sm"
              />
            ) : sortField === "title" ? (
              <SegmentTabs<"title-az" | "title-za">
                value={titleSortOption}
                options={[
                  { value: "title-az", label: t("timeline.sortOrderAz") },
                  { value: "title-za", label: t("timeline.sortOrderZa") },
                ]}
                onChange={setTitleSortOption}
                size="sm"
              />
            ) : (
              <SegmentTabs<"cost-asc" | "cost-desc">
                value={costSortOption}
                options={[
                  {
                    value: "cost-asc",
                    label: t("timeline.sortOrderAmountAsc"),
                  },
                  {
                    value: "cost-desc",
                    label: t("timeline.sortOrderAmountDesc"),
                  },
                ]}
                onChange={setCostSortOption}
                size="sm"
              />
            )}
          </View>
        </CardRow>
        <Pressable
          onPress={() => openPicker("from")}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
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
          </CardRow>
        </Pressable>
        {openDatePicker === "from" ? (
          <InlineDatePicker
            value={datePickerDraft}
            onChangeDraft={setDatePickerDraft}
            onCancel={() => setOpenDatePicker(null)}
            onConfirm={(picked) => {
              const ymd = formatYmd(picked);
              setDateFrom(ymd);
              setOpenDatePicker(null);
            }}
          />
        ) : null}

        <Pressable
          onPress={() => openPicker("to")}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
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
          </CardRow>
        </Pressable>
        {openDatePicker === "to" ? (
          <InlineDatePicker
            value={datePickerDraft}
            onChangeDraft={setDatePickerDraft}
            onCancel={() => setOpenDatePicker(null)}
            onConfirm={(picked) => {
              const ymd = formatYmd(picked);
              setDateTo(ymd);
              setOpenDatePicker(null);
            }}
          />
        ) : null}
        <CardRow>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={minCost}
            onChangeText={setMinCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMinCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </CardRow>
        <CardRow>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={maxCost}
            onChangeText={setMaxCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMaxCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </CardRow>
      </Card>
    </ModalFormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
    },
  });
