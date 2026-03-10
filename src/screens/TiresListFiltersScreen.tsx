import { useLayoutEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { TireType } from "../types/domain";
import { setPendingModalResult } from "../app/pendingModalResult";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { ModalButton } from "../ui/components/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

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
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("timeline.filtersTitle", { defaultValue: "Filters" }),
      headerBackVisible: false,
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTitleStyle: { color: theme.colors.fg },
      headerLeft: () => (
        <ModalButton variant="cancel" onPress={() => navigation.goBack()}>
          {t("common.cancel")}
        </ModalButton>
      ),
      headerRight: () => (
        <ModalButton variant="done" onPress={applyFilters}>
          {t("common.done")}
        </ModalButton>
      ),
    });
  }, [
    navigation,
    t,
    theme.colors.bg,
    theme.colors.fg,
    tireTypeFilter,
    fittedFilter,
    sortOrder,
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
          <View
            style={[
              styles.segmentWrap,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.bg,
              },
            ]}
          >
            {(["all", "fitted", "not_fitted"] as const).map((opt) => {
              const selected = fittedFilter === opt;
              const label =
                opt === "all"
                  ? t("common.all")
                  : opt === "fitted"
                    ? t("wheels.currentlyFitted")
                    : t("wheels.notFitted", { defaultValue: "Not fitted" });
              return (
                <Pressable
                  key={opt}
                  onPress={() => setFittedFilter(opt)}
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
  });
