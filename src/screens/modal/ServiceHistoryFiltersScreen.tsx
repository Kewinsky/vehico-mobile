import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { ServiceEntryCategory } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { Card } from "../../ui/components/common/Card";
import { ModalFormScreen } from "../../ui/components/layout/ModalFormScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { ListFilter } from "lucide-react-native";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { FormDateRow } from "../../ui/components/common/FormDateRow";
import { FormPickerRow } from "../../ui/components/common/FormPickerRow";

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

const CATEGORY_FILTER_OPTIONS = [
  "all",
  ...CATEGORY_OPTIONS,
] as const satisfies readonly ("all" | ServiceEntryCategory)[];

const SORT_FIELD_OPTIONS = ["date", "title", "cost"] as const;

type Props = NativeStackScreenProps<AppStackParamList, "ServiceHistoryFilters">;

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

  function setSortField(next: "date" | "title" | "cost") {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
    if (next === "cost") setSortOption("cost-asc");
  }

  const categoryOptions = useMemo(() => [...CATEGORY_FILTER_OPTIONS], []);

  const sortOrderOptions = useMemo((): SortOption[] => {
    if (sortField === "date") return ["date-newest", "date-oldest"];
    if (sortField === "title") return ["title-az", "title-za"];
    return ["cost-asc", "cost-desc"];
  }, [sortField]);

  function clearFilters() {
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setMinCost("");
    setMaxCost("");
    setSortOption("date-newest");
  }

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
        <FormPickerRow<"all" | ServiceEntryCategory>
          icon="pricetag-outline"
          label={t("timeline.filterCategory")}
          value={categoryFilter}
          options={categoryOptions}
          getLabel={(value) =>
            value === "all"
              ? t("common.all")
              : t(`entryForm.categories.${value}` as any)
          }
          onChange={(value) => {
            if (value) setCategoryFilter(value);
          }}
          mutedValues={["all"]}
          rowStyle={styles.rowSpread}
        />
        <FormPickerRow<"date" | "title" | "cost">
          icon="swap-vertical-outline"
          label={t("timeline.sortBy")}
          value={sortField}
          options={SORT_FIELD_OPTIONS}
          getLabel={(value) =>
            value === "date"
              ? t("timeline.sortFieldDate")
              : value === "title"
                ? t("timeline.sortFieldTitle")
                : t("timeline.sortFieldAmount")
          }
          onChange={(value) => {
            if (value) setSortField(value);
          }}
          rowStyle={styles.rowSpread}
        />
        <FormPickerRow<SortOption>
          iconComponent={<ListFilter size={20} color={theme.colors.accent} />}
          label={t("timeline.sortOrderNewest")}
          value={sortOption}
          options={sortOrderOptions}
          getLabel={(value) => {
            if (value === "date-oldest") return t("timeline.sortOrderOldest");
            if (value === "date-newest") return t("timeline.sortOrderNewest");
            if (value === "title-az") return t("timeline.sortOrderAz");
            if (value === "title-za") return t("timeline.sortOrderZa");
            if (value === "cost-asc") return t("timeline.sortOrderAmountAsc");
            return t("timeline.sortOrderAmountDesc");
          }}
          onChange={(value) => {
            if (value) setSortOption(value);
          }}
          rowStyle={styles.rowSpread}
        />
        <FormDateRow
          icon="calendar-outline"
          label={t("timeline.filterFrom")}
          value={dateFrom}
          onChange={setDateFrom}
          rowStyle={styles.rowSpread}
        />

        <FormDateRow
          icon="calendar-outline"
          label={t("timeline.filterTo")}
          value={dateTo}
          onChange={setDateTo}
          rowStyle={styles.rowSpread}
        />

        <FormInputRow
          icon="cash-outline"
          label={t("timeline.filterMinCost")}
          value={minCost}
          onChangeText={setMinCost}
          keyboardType="decimal-pad"
          placeholder={t("timeline.placeholderMinCost")}
        />
        <FormInputRow
          icon="cash-outline"
          label={t("timeline.filterMaxCost")}
          value={maxCost}
          onChangeText={setMaxCost}
          keyboardType="decimal-pad"
          placeholder={t("timeline.placeholderMaxCost")}
        />
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
