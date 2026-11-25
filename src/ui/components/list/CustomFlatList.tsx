import { useMemo } from "react";
import { FlatList, FlatListProps, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";
import { MonthYearSeparator } from "./MonthYearSeparator";

import type { CustomFlatListProps, CustomFlatListRow } from "./CustomFlatList.types";
import { buildGrouped } from "./listGrouping";

export type { CustomFlatListRow } from "./CustomFlatList.types";

export function CustomFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  listHeaderComponent = null,
  groupByMonth = false,
  getMonthYearKey,
  contentContainerStyle,
  style,
  ListEmptyComponent,
  nativeRows: _nativeRows,
  ...rest
}: CustomFlatListProps<T>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const flatData = useMemo(() => {
    if (groupByMonth && getMonthYearKey) {
      return buildGrouped(data, getMonthYearKey);
    }
    return data;
  }, [data, groupByMonth, getMonthYearKey]);

  const isGrouped = groupByMonth && getMonthYearKey;

  const listStyle = [styles.list];
  const automaticInsets =
    Platform.OS === "ios" && rest.contentInsetAdjustmentBehavior === "automatic";
  const contentStyle = [
    styles.listContent,
    automaticInsets
      ? { paddingTop: 0, paddingBottom: 0 }
      : { paddingTop: headerHeight },
    contentContainerStyle,
  ];

  if (isGrouped) {
    const groupedData = flatData as CustomFlatListRow<T>[];
    const {
      data: _data,
      renderItem: _renderItem,
      keyExtractor: _keyExtractor,
      ListHeaderComponent: _ListHeaderComponent,
      ...groupedRest
    } = rest as FlatListProps<CustomFlatListRow<T>>;
    return (
      <View style={styles.listWrap}>
        <FlatList<CustomFlatListRow<T>>
          data={groupedData}
          ListHeaderComponent={
            listHeaderComponent != null ? <>{listHeaderComponent}</> : undefined
          }
          keyExtractor={(row) =>
            row.type === "separator"
              ? `sep-${row.monthYearKey}`
              : keyExtractor(row.item)
          }
          renderItem={({ item: row, index }) => {
            if (row.type === "separator") {
              return (
                <MonthYearSeparator
                  isFirst={index === 0}
                  monthYear={row.monthYear}
                />
              );
            }
            return renderItem({ item: row.item });
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
          style={listStyle}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator
          ListEmptyComponent={ListEmptyComponent}
          {...groupedRest}
        />
      </View>
    );
  }

  return (
    <FlatList<T>
      data={data}
      ListHeaderComponent={
        listHeaderComponent != null ? <>{listHeaderComponent}</> : undefined
      }
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={() => (
        <View style={{ height: theme.spacing.sm }} />
      )}
      style={style ?? listStyle}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator
      ListEmptyComponent={ListEmptyComponent}
      {...rest}
    />
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    listWrap: { flex: 1 },
    list: {
      flex: 1,
      // Extend list to screen edges and handle padding in contentContainerStyle
      marginHorizontal: -theme.layout.contentPaddingHorizontal,
    },
    listContent: {
      paddingBottom: insets.bottom,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
  });
