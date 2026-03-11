import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { ModalLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { ModalButton } from "../../ui/components/layout/ModalButton";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export type AddAttachmentFiltersParams = {
  sortOption: "date-newest" | "date-oldest" | "title-az" | "title-za";
};

type Props = NativeStackScreenProps<AppStackParamList, "AddAttachmentFilters">;

export function AddAttachmentFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        <View style={styles.row}>
          <Ionicons
            name="swap-vertical-outline"
            size={20}
            color={theme.colors.accent}
          />
          <View style={styles.segmentWrap}>
            <SegmentTabs<"date" | "title">
              value={sortField}
              options={[
                { value: "date", label: t("timeline.sortFieldDate") },
                { value: "title", label: t("timeline.sortFieldTitle") },
              ]}
              onChange={setSortField}
              size="sm"
            />
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
          <View style={styles.segmentWrap}>
            {sortField === "date" ? (
              <SegmentTabs<"date-newest" | "date-oldest">
                value={sortOption}
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
                onChange={setSortOption}
                size="sm"
              />
            ) : (
              <SegmentTabs<"title-az" | "title-za">
                value={sortOption}
                options={[
                  { value: "title-az", label: t("timeline.sortOrderAz") },
                  { value: "title-za", label: t("timeline.sortOrderZa") },
                ]}
                onChange={setSortOption}
                size="sm"
              />
            )}
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
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
