import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { GasStation } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { ModalFormScreen } from "../../ui/components/layout/ModalFormScreen";
import { Card, CardRow } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { FormDateRow } from "../../ui/components/common/FormDateRow";

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

export function FuelFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(params.dateTo ?? "");
  const [stationFilter, setStationFilter] = useState<GasStation | null>(
    (params.stationFilter as GasStation | null) ?? null,
  );
  const [minCost, setMinCost] = useState(params.minCost ?? "");
  const [maxCost, setMaxCost] = useState(params.maxCost ?? "");
  const stationPlaceholder = t("fuelingForm.gasStationPlaceholderShort");

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setStationFilter(null);
    setMinCost("");
    setMaxCost("");
  }

  function showStationPicker() {
    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }[] = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.all"), onPress: () => setStationFilter(null) },
      ...GAS_STATION_OPTIONS.map((s) => ({
        text: t(`fuelingForm.stations.${s}`),
        onPress: () => setStationFilter(s),
      })),
    ];
    Alert.alert(
      t("timeline.filterStation"),
      t("common.chooseOption"),
      buttons,
      {
        cancelable: true,
      },
    );
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
      title={t("timeline.filtersTitle")}
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
          <CardRow style={styles.rowSpread}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[styles.label, { color: theme.colors.muted }]}>
                {t("timeline.filterStation")}
              </Text>
            </View>
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
              numberOfLines={1}
            >
              {stationFilter != null
                ? t(`fuelingForm.stations.${stationFilter}`)
                : stationPlaceholder}
            </Text>
          </CardRow>
        </Pressable>

        <FormDateRow
          icon="calendar-outline"
          label={t("timeline.filterFrom")}
          value={dateFrom}
          onChange={setDateFrom}
          placeholder={t("common.chooseOption")}
          rowStyle={styles.rowSpread}
        />

        <FormDateRow
          icon="calendar-outline"
          label={t("timeline.filterTo")}
          value={dateTo}
          onChange={setDateTo}
          placeholder={t("common.chooseOption")}
          rowStyle={styles.rowSpread}
        />

        <FormInputRow
          icon="cash-outline"
          label={t("timeline.filterMinCost")}
          value={minCost}
          onChangeText={setMinCost}
          keyboardType="decimal-pad"
          placeholder={t("timeline.placeholderMinCost")}
        />
        <FormInputRow
          icon="cash-outline"
          label={t("timeline.filterMaxCost")}
          value={maxCost}
          onChangeText={setMaxCost}
          keyboardType="decimal-pad"
          placeholder={t("timeline.placeholderMaxCost")}
        />
      </Card>
    </ModalFormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    rowSpread: {
      justifyContent: "space-between",
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      textAlign: "right",
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
  });
