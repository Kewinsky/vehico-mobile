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

export type WheelsListFiltersParams = {
  fittedFilter: "all" | "fitted" | "not_fitted";
  sortOrder: "az" | "za";
};

type Props = NativeStackScreenProps<AppStackParamList, "WheelsListFilters">;

export function WheelsListFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

  const [fittedFilter, setFittedFilter] = useState<
    "all" | "fitted" | "not_fitted"
  >(params.fittedFilter ?? "all");
  const [sortOrder, setSortOrder] = useState<"az" | "za">(
    params.sortOrder ?? "az",
  );

  function clearFilters() {
    setFittedFilter("all");
    setSortOrder("az");
  }

  function applyFilters() {
    const applied: WheelsListFiltersParams = {
      fittedFilter,
      sortOrder,
    };
    setPendingModalResult("wheelsList", applied);
    navigation.goBack();
  }

  return (
    <ModalLayout
      title={t("timeline.filtersTitle")}
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
                      label: t("wheels.notFitted", {
                        defaultValue: "Not fitted",
                      }),
                    },
                  ]}
                  onChange={setFittedFilter}
                  size="sm"
                />
              </View>
            </CardRow>
            <CardRow>
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
