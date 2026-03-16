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
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";

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
