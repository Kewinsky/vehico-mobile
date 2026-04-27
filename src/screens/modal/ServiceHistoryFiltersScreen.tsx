import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { ServiceEntryCategory } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { ModalFormScreen } from "../../ui/components/layout/ModalFormScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";
import { InlineDatePicker } from "../../ui/components/common/InlineDatePicker";
import { ListFilter } from "lucide-react-native";

export type ServiceHistoryFiltersParams = {
  categoryFilter: "all" | ServiceEntryCategory;
  dateFrom: string;
  dateTo: string;
  minCost: string;
  maxCost: string;
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

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
    Alert.alert(
      t("timeline.filterCategory"),
      t("common.chooseOption"),
      buttons,
      {
        cancelable: true,
      },
    );
  }

  function showSortFieldPicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("timeline.sortFieldDate"),
        onPress: () => setSortField("date"),
      },
      {
        text: t("timeline.sortFieldTitle"),
        onPress: () => setSortField("title"),
      },
      {
        text: t("timeline.sortFieldAmount"),
        onPress: () => setSortField("cost"),
      },
    ];
    Alert.alert(t("timeline.sortBy"), t("common.chooseOption"), buttons, {
      cancelable: true,
    });
  }

  function showSortOrderPicker() {
    const baseButtons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [{ text: t("common.cancel"), style: "cancel" }];

    if (sortField === "date") {
      baseButtons.push(
        {
          text: t("timeline.sortOrderNewest"),
          onPress: () => setDateSortOption("date-newest"),
        },
        {
          text: t("timeline.sortOrderOldest"),
          onPress: () => setDateSortOption("date-oldest"),
        },
      );
    } else if (sortField === "title") {
      baseButtons.push(
        {
          text: t("timeline.sortOrderAz"),
          onPress: () => setTitleSortOption("title-az"),
        },
        {
          text: t("timeline.sortOrderZa"),
          onPress: () => setTitleSortOption("title-za"),
        },
      );
    } else {
      baseButtons.push(
        {
          text: t("timeline.sortOrderAmountAsc"),
          onPress: () => setCostSortOption("cost-asc"),
        },
        {
          text: t("timeline.sortOrderAmountDesc"),
          onPress: () => setCostSortOption("cost-desc"),
        },
      );
    }

    Alert.alert(t("timeline.sortBy"), t("common.chooseOption"), baseButtons, {
      cancelable: true,
    });
  }

  const categoryLabel =
    categoryFilter === "all"
      ? t("entryForm.categoryPlaceholder")
      : t(`entryForm.categories.${categoryFilter}` as any);
  const sortFieldLabel =
    sortField === "date"
      ? t("timeline.sortFieldDate")
      : sortField === "title"
        ? t("timeline.sortFieldTitle")
        : t("timeline.sortFieldAmount");
  const sortOrderLabel =
    sortField === "date"
      ? dateSortOption === "date-oldest"
        ? t("timeline.sortOrderOldest")
        : t("timeline.sortOrderNewest")
      : sortField === "title"
        ? titleSortOption === "title-za"
          ? t("timeline.sortOrderZa")
          : t("timeline.sortOrderAz")
        : costSortOption === "cost-desc"
          ? t("timeline.sortOrderAmountDesc")
          : t("timeline.sortOrderAmountAsc");

  function applyFilters() {
    const applied: ServiceHistoryFiltersParams = {
      categoryFilter,
      dateFrom,
      dateTo,
      minCost,
      maxCost,
      sortOption,
    };
    setPendingModalResult("serviceHistory", applied);
    navigation.goBack();
  }

  return (
    <ModalFormScreen
      title={t("timeline.filtersTitle")}
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
        <Pressable
          onPress={showCategoryPicker}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.filterCategory")}
              </Text>
            </View>
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
              numberOfLines={1}
            >
              {categoryLabel}
            </Text>
          </CardRow>
        </Pressable>
        <Pressable
          onPress={showSortFieldPicker}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.sortBy")}
              </Text>
            </View>
            <Text
              style={[styles.valueText, { color: theme.colors.fg }]}
              numberOfLines={1}
            >
              {sortFieldLabel}
            </Text>
          </CardRow>
        </Pressable>
        <Pressable
          onPress={showSortOrderPicker}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <ListFilter size={20} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.sortOrderNewest")}
              </Text>
            </View>
            <Text
              style={[styles.valueText, { color: theme.colors.fg }]}
              numberOfLines={1}
            >
              {sortOrderLabel}
            </Text>
          </CardRow>
        </Pressable>
        <Pressable
          onPress={() => openPicker("from")}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.filterFrom")}
              </Text>
            </View>
            <Text
              style={[
                styles.valueText,
                { color: dateFrom ? theme.colors.fg : theme.colors.muted },
              ]}
              numberOfLines={1}
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
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.filterTo")}
              </Text>
            </View>
            <Text
              style={[
                styles.valueText,
                { color: dateTo ? theme.colors.fg : theme.colors.muted },
              ]}
              numberOfLines={1}
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
        <CardRow style={styles.rowSpread}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="cash-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("timeline.filterMinCost")}
            </Text>
          </View>
          <TextInput
            value={minCost}
            onChangeText={setMinCost}
            keyboardType="decimal-pad"
            placeholder={t("timeline.placeholderMinCost")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </CardRow>
        <CardRow style={styles.rowSpread}>
          <View style={styles.rowLeft}>
            <Ionicons
              name="cash-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("timeline.filterMaxCost")}
            </Text>
          </View>
          <TextInput
            value={maxCost}
            onChangeText={setMaxCost}
            keyboardType="decimal-pad"
            placeholder={t("timeline.placeholderMaxCost")}
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.input,
              { color: theme.colors.fg, textAlign: "right" },
            ]}
          />
        </CardRow>
      </Card>
    </ModalFormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    rowSpread: {
      justifyContent: "space-between",
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      textAlign: "right",
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
  });
