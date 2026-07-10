import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { setPendingModalResult } from "../../core/pendingModalResult";
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

export function RemindersFiltersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = useLocalSearchParams<{
    dateFrom?: string;
    dateTo?: string;
    statusFilter?: "all" | "active" | "done";
  }>();

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
