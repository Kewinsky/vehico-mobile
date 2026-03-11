import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { TireType } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export type TiresListFiltersParams = {
  tireTypeFilter: TireType | "all";
  fittedFilter: "all" | "fitted" | "not_fitted";
  sortOrder: "az" | "za";
};

const TIRE_TYPES: (TireType | "all")[] = [
  "all",
  "summer",
  "winter",
  "all_season",
  "run_flat",
  "uhp",
  "suv_xl",
];

type Props = NativeStackScreenProps<AppStackParamList, "TiresListFilters">;

export function TiresListFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

  const [tireTypeFilter, setTireTypeFilter] = useState<TireType | "all">(
    (params.tireTypeFilter as TireType | "all") ?? "all",
  );
  const [fittedFilter, setFittedFilter] = useState<
    "all" | "fitted" | "not_fitted"
  >(params.fittedFilter ?? "all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">(
    params.sortOrder ?? "az",
  );

  function clearFilters() {
    setTireTypeFilter("all");
    setFittedFilter("all");
    setSortOrder("az");
  }

  function showTireTypePicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setTireTypeFilter("all") },
      ...TIRE_TYPES.filter((x) => x !== "all").map((tp) => ({
        text: t(`tireForm.types.${tp}`),
        onPress: () => setTireTypeFilter(tp),
      })),
    ];
    Alert.alert(
      t("wheels.filterByType", { defaultValue: "Filter by type" }),
      "",
      buttons,
      {
        cancelable: true,
      },
    );
  }

  function applyFilters() {
    const applied: TiresListFiltersParams = {
      tireTypeFilter,
      fittedFilter,
      sortOrder,
    };
    setPendingModalResult("tiresList", applied);
    navigation.goBack();
  }

  return (
    <ModalLayout
      title={t("timeline.filtersTitle", { defaultValue: "Filters" })}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      done={{ onPress: applyFilters, label: t("common.done") }}
      footer={
        <Button variant="outlined" onPress={clearFilters}>
          {t("common.clearButton")}
        </Button>
      }
    >
      <FormScreen noLayout>
      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <Pressable
          onPress={showTireTypePicker}
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
                  tireTypeFilter === "all"
                    ? theme.colors.muted
                    : theme.colors.fg,
              },
            ]}
          >
            {tireTypeFilter === "all"
              ? t("common.all")
              : t(`tireForm.types.${tireTypeFilter}`)}
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
            name="checkmark-circle-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            <SegmentTabs<"all" | "fitted" | "not_fitted">
              value={fittedFilter}
              options={[
                { value: "all", label: t("common.all") },
                { value: "fitted", label: t("wheels.currentlyFitted") },
                {
                  value: "not_fitted",
                  label: t("wheels.notFitted", { defaultValue: "Not fitted" }),
                },
              ]}
              onChange={setFittedFilter}
              size="sm"
            />
          </View>
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.row}>
          <Ionicons
            name="swap-vertical-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            <SegmentTabs<"az" | "za">
              value={sortOrder}
              options={[
                { value: "az", label: t("workshops.sortAz") },
                { value: "za", label: t("workshops.sortZa") },
              ]}
              onChange={setSortOrder}
              size="sm"
            />
          </View>
        </View>
      </View>
      </FormScreen>
    </ModalLayout>
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
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
