import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { GasStation } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { ModalFormScreen } from "../../ui/components/layout/ModalFormScreen";
import { Card, CardRow } from "../../ui/components/common/Card";
import { useTheme } from "../../ui/ThemeProvider";
import { useUserSettings } from "../../app/providers/UserSettingsProvider";
import { Ionicons } from "@expo/vector-icons";
import { InlineDatePicker } from "../../ui/components/common/InlineDatePicker";

const GAS_STATION_OPTIONS: readonly GasStation[] = [
  "orlen",
  "bp",
  "shell",
  "circle_k",
  "mol",
  "moya",
  "other",
];

export type FuelFiltersParams = {
  dateFrom: string;
  dateTo: string;
  stationFilter: GasStation | null;
  minCost: string;
  maxCost: string;
};

type Props = NativeStackScreenProps<AppStackParamList, "FuelFilters">;

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

export function FuelFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;
  const currency = settings?.currency ?? "PLN";

  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(params.dateTo ?? "");
  const [openDatePicker, setOpenDatePicker] = useState<"from" | "to" | null>(
    null,
  );
  const [datePickerDraft, setDatePickerDraft] = useState<Date>(new Date());
  const [stationFilter, setStationFilter] = useState<GasStation | null>(
    (params.stationFilter as GasStation | null) ?? null,
  );
  const [minCost, setMinCost] = useState(params.minCost ?? "");
  const [maxCost, setMaxCost] = useState(params.maxCost ?? "");

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setStationFilter(null);
    setMinCost("");
    setMaxCost("");
    setOpenDatePicker(null);
  }

  function openPicker(kind: "from" | "to") {
    const current = kind === "from" ? dateFrom : dateTo;
    setDatePickerDraft(
      parseYmd(current.trim().length === 10 ? current : formatYmd(new Date())),
    );
    setOpenDatePicker(kind);
  }

  function showStationPicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setStationFilter(null) },
      ...GAS_STATION_OPTIONS.map((s) => ({
        text: t(`fuelingForm.stations.${s}`),
        onPress: () => setStationFilter(s),
      })),
    ];
    Alert.alert(t("timeline.filterStation"), "", buttons, { cancelable: true });
  }

  function applyFilters() {
    const applied: FuelFiltersParams = {
      dateFrom,
      dateTo,
      stationFilter,
      minCost,
      maxCost,
    };
    setPendingModalResult("fuel", applied);
    navigation.goBack();
  }

  return (
    <ModalFormScreen
      title={t("timeline.filtersTitle", { defaultValue: "Filters" })}
      onCancel={() => navigation.goBack()}
      onDone={applyFilters}
      cancelLabel={t("common.cancel")}
      doneLabel={t("common.done")}
      footer={
        <Button variant="outlined" onPress={clearFilters}>
          {t("common.clearButton")}
        </Button>
      }
    >
      <Card>
        <Pressable
          onPress={showStationPicker}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
            <Ionicons
              name="location-outline"
              size={20}
              color={theme.colors.accent}
            />
            <Text
              style={[
                styles.valueText,
                {
                  color:
                    stationFilter != null
                      ? theme.colors.fg
                      : theme.colors.muted,
                },
              ]}
            >
              {stationFilter != null
                ? t(`fuelingForm.stations.${stationFilter}`)
                : t("timeline.filterStation")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.accent}
            />
          </CardRow>
        </Pressable>

        <Pressable
          onPress={() => openPicker("from")}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
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
          </CardRow>
        </Pressable>
        {openDatePicker === "from" ? (
          <InlineDatePicker
            value={datePickerDraft}
            onChangeDraft={setDatePickerDraft}
            onCancel={() => setOpenDatePicker(null)}
            onConfirm={(picked) => {
              const ymd = formatYmd(picked);
              setDateFrom(ymd);
              setOpenDatePicker(null);
            }}
          />
        ) : null}

        <Pressable
          onPress={() => openPicker("to")}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <CardRow>
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
          </CardRow>
        </Pressable>
        {openDatePicker === "to" ? (
          <InlineDatePicker
            value={datePickerDraft}
            onChangeDraft={setDatePickerDraft}
            onCancel={() => setOpenDatePicker(null)}
            onConfirm={(picked) => {
              const ymd = formatYmd(picked);
              setDateTo(ymd);
              setOpenDatePicker(null);
            }}
          />
        ) : null}

        <CardRow>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={minCost}
            onChangeText={setMinCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMinCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </CardRow>
        <CardRow>
          <Ionicons name="cash-outline" size={20} color={theme.colors.accent} />
          <TextInput
            value={maxCost}
            onChangeText={setMaxCost}
            keyboardType="decimal-pad"
            placeholder={`${t("timeline.filterMaxCost")} (${currency})`}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, { color: theme.colors.fg }]}
          />
        </CardRow>
      </Card>
    </ModalFormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
  });
