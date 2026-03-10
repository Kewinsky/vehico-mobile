import { useLayoutEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { setPendingModalResult } from "../app/pendingModalResult";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { ModalButton } from "../ui/components/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../ui/components/ChoiceChip";

export type AddAttachmentFiltersParams = {
  sortOption: "date-newest" | "date-oldest" | "title-az" | "title-za";
};

type Props = NativeStackScreenProps<AppStackParamList, "AddAttachmentFilters">;

export function AddAttachmentFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const params = route.params;

  const [sortOption, setSortOption] = useState<
    AddAttachmentFiltersParams["sortOption"]
  >(params.sortOption ?? "date-newest");

  const sortField = useMemo(() => {
    const [field] = sortOption.split("-") as [string, string];
    return field === "title" ? ("title" as const) : ("date" as const);
  }, [sortOption]);

  function setSortField(next: "date" | "title") {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
  }

  function clearFilters() {
    setSortOption("date-newest");
  }

  function applyFilters() {
    setPendingModalResult("addAttachment", { sortOption });
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
  }, [navigation, t, theme.colors.bg, theme.colors.fg, sortOption]);

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
            {(["date", "title"] as const).map((f) => {
              const selected = sortField === f;
              const label =
                f === "date"
                  ? t("timeline.sortFieldDate")
                  : t("timeline.sortFieldTitle");
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
              : (["az", "za"] as const).map((o) => {
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
