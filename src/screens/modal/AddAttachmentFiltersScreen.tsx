import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { setPendingModalResult } from "../../core/pendingModalResult";
import { ModalLayout } from "../../layouts";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";

export type AddAttachmentFiltersParams = {
  sortOption: "date-newest" | "date-oldest" | "title-az" | "title-za";
};

export function AddAttachmentFiltersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = useLocalSearchParams<{
    sortOption?: string;
  }>();

  const initialSortOption =
    (Array.isArray(params.sortOption) ? params.sortOption[0] : params.sortOption) ??
    "date-newest";

  const [sortOption, setSortOption] = useState<
    AddAttachmentFiltersParams["sortOption"]
  >(
    initialSortOption as AddAttachmentFiltersParams["sortOption"],
  );

  const sortField = useMemo(() => {
    const [field] = sortOption.split("-") as [string, string];
    return field === "title" ? ("title" as const) : ("date" as const);
  }, [sortOption]);
  const dateSortOption =
    sortOption === "date-oldest" ? "date-oldest" : "date-newest";
  const titleSortOption = sortOption === "title-za" ? "title-za" : "title-az";

  function setSortField(next: "date" | "title") {
    if (next === sortField) return;
    if (next === "date") setSortOption("date-newest");
    if (next === "title") setSortOption("title-az");
  }

  function setDateSortOption(next: "date-newest" | "date-oldest") {
    setSortOption(next);
  }

  function setTitleSortOption(next: "title-az" | "title-za") {
    setSortOption(next);
  }

  function clearFilters() {
    setSortOption("date-newest");
  }

  function applyFilters() {
    setPendingModalResult("addAttachment", { sortOption });
    router.back();
  }

  return (
    <ModalLayout
      title={t("timeline.filtersTitle")}
      cancel={{ onPress: () => router.back(), label: t("common.cancel") }}
      done={{ onPress: applyFilters, label: t("common.done") }}
      footer={
        <Button variant="outlined" onPress={clearFilters}>
          {t("common.clearButton")}
        </Button>
      }
    >
      <FormScreen noLayout>
        <NativeHeaderScrollView>
          <Card>
            <CardRow>
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
                ) : (
                  <SegmentTabs<"title-az" | "title-za">
                    value={titleSortOption}
                    options={[
                      { value: "title-az", label: t("timeline.sortOrderAz") },
                      { value: "title-za", label: t("timeline.sortOrderZa") },
                    ]}
                    onChange={setTitleSortOption}
                    size="sm"
                  />
                )}
              </View>
            </CardRow>
          </Card>
        </NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
