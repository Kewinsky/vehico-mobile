import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";

export type RemindersFiltersParams = {
  dateFrom: string;
  dateTo: string;
  statusFilter: "all" | "active" | "done";
};

type Props = NativeStackScreenProps<AppStackParamList, "RemindersFilters">;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(year, month - 1, day);
}

export function RemindersFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  const params = route.params;

  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(params.dateTo ?? "");
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    params.statusFilter ?? "all",
  );

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setOpenDatePicker(null);
  }

  function openPicker(kind: "from" | "to") {
    const current = kind === "from" ? dateFrom : dateTo;
    setDatePickerDraft(
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date())),
    );
    setOpenDatePicker(kind);
  }

  function cancelPicker() {
    setOpenDatePicker(null);
  }

  function confirmPicker() {
    if (!openDatePicker) return;
    const ymd = formatYmd(datePickerDraft);
    if (openDatePicker === "from") setDateFrom(ymd);
    if (openDatePicker === "to") setDateTo(ymd);
    setOpenDatePicker(null);
  }

  function renderInlineDatePicker() {
    return (
      <View
        style={[
          styles.pickerWrap,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <DateTimePicker
          value={datePickerDraft}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant={
            Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
              ? "dark"
              : "light"
          }
          onChange={(event, selectedDate) => {
            if (Platform.OS === "ios") {
              if (selectedDate) setDatePickerDraft(selectedDate);
              return;
            }
            setOpenDatePicker(null);
            if ((event as any)?.type === "dismissed") return;
            if (!selectedDate) return;
            const ymd = formatYmd(selectedDate);
            if (openDatePicker === "from") setDateFrom(ymd);
            if (openDatePicker === "to") setDateTo(ymd);
          }}
        />
        {Platform.OS === "ios" ? (
          <View style={styles.pickerActionsRow}>
            <Pressable
              onPress={cancelPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[styles.pickerActionText, { color: theme.colors.muted }]}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmPicker}
              style={({ pressed }) => [
                styles.pickerActionBtn,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: accentBg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.pickerActionText,
                  { color: theme.colors.accent },
                ]}
              >
                {t("common.done")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
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
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <Pressable
          onPress={() => openPicker("from")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text
            style={[
              styles.valueText,
              { color: dateFrom ? theme.colors.fg : theme.colors.muted },
            ]}
          >
            {dateFrom || t("timeline.filterFrom")}
          </Text>
        </Pressable>
        {openDatePicker === "from" ? (
          <>
            {renderInlineDatePicker()}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </>
        ) : (
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
        )}

        <Pressable
          onPress={() => openPicker("to")}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text
            style={[
              styles.valueText,
              { color: dateTo ? theme.colors.fg : theme.colors.muted },
            ]}
          >
            {dateTo || t("timeline.filterTo")}
          </Text>
        </Pressable>
        {openDatePicker === "to" ? (
          <>
            {renderInlineDatePicker()}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
          </>
        ) : null}
      </View>
        </NativeHeaderScrollView>
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
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
    divider: { height: 1, width: "100%" },
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    pickerWrap: {
      borderTopWidth: 1,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
