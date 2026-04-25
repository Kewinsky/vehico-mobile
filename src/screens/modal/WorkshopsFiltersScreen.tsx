import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import type { WorkshopType } from "../../types/domain";
import { setPendingModalResult } from "../../app/pendingModalResult";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardRow } from "../../ui/components/common/Card";

export type WorkshopsFiltersParams = {
  typeFilter: WorkshopType | "all";
  sortOrder: "az" | "za";
};

const WORKSHOP_TYPES: (WorkshopType | "all")[] = [
  "all",
  "mechanic",
  "electrician",
  "detailer",
  "bodywork",
  "car_wash",
  "other",
];

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopsFilters">;

export function WorkshopsFiltersScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const params = route.params;

  const [typeFilter, setTypeFilter] = useState<WorkshopType | "all">(
    (params.typeFilter as WorkshopType | "all") ?? "all",
  );
  const [sortOrder, setSortOrder] = useState<"az" | "za">(
    params.sortOrder ?? "az",
  );

  function getWorkshopTypeLabel(type: string): string {
    return t(`workshopForm.types.${type}`);
  }

  function clearFilters() {
    setTypeFilter("all");
    setSortOrder("az");
  }

  function showTypePicker() {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default";
    }> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("workshops.typeAll"), onPress: () => setTypeFilter("all") },
      ...WORKSHOP_TYPES.filter((x) => x !== "all").map((tp) => ({
        text: getWorkshopTypeLabel(tp),
        onPress: () => setTypeFilter(tp),
      })),
    ];
    Alert.alert(t("workshops.filterByType"), t("common.chooseOption"), buttons, {
      cancelable: true,
    });
  }

  function applyFilters() {
    const applied: WorkshopsFiltersParams = {
      typeFilter,
      sortOrder,
    };
    setPendingModalResult("workshops", applied);
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
            <Pressable
              onPress={showTypePicker}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <CardRow>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text
                  style={[
                    styles.valueText,
                    {
                      color:
                        typeFilter === "all"
                          ? theme.colors.muted
                          : theme.colors.fg,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {typeFilter === "all"
                    ? t("workshops.filterByType")
                    : getWorkshopTypeLabel(typeFilter)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.accent}
                />
              </CardRow>
            </Pressable>

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
    valueText: { flex: 1, minWidth: 0, fontSize: theme.typography.body },
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
