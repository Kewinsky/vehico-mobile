import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormDateRow } from "../../ui/components/common/FormDateRow";

export type RemindersFiltersParams = {
  dateFrom: string;
  dateTo: string;
  statusFilter: "all" | "active" | "done";
};

type Props = NativeStackScreenProps<AppStackParamList, "RemindersFilters">;

export function RemindersFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(params.dateTo ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    params.statusFilter ?? "all",
  );

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  }

  function applyFilters() {
    const applied: RemindersFiltersParams = {
      dateFrom,
      dateTo,
      statusFilter,
    };
    setPendingModalResult("reminders", applied);
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
                <SegmentTabs<"all" | "active" | "done">
                  value={statusFilter}
                  options={[
                    { value: "all", label: t("reminders.filterAll") },
                    {
                      value: "active",
                      label: t("reminderDetail.status.active"),
                    },
                    { value: "done", label: t("reminderDetail.status.done") },
                  ]}
                  onChange={setStatusFilter}
                  size="sm"
                />
              </View>
            </CardRow>

            <FormDateRow
              icon="calendar-outline"
              label={t("timeline.filterFrom")}
              value={dateFrom}
              onChange={setDateFrom}
            />

            <FormDateRow
              icon="calendar-outline"
              label={t("timeline.filterTo")}
              value={dateTo}
              onChange={setDateTo}
            />
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
