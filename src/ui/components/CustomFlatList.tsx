import { useMemo } from "react";
import { FlatList, FlatListProps, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";
import { MonthYearSeparator } from "./MonthYearSeparator";

export type CustomFlatListRow<T> =
  | { type: "separator"; monthYear: string; monthYearKey: string }
  | { type: "item"; item: T };

type CustomFlatListProps<T> = Omit<
  FlatListProps<T>,
  "data" | "renderItem" | "keyExtractor" | "ListHeaderComponent"
> & {
  data: T[];
  renderItem: (info: { item: T }) => React.ReactElement | null;
  keyExtractor: (item: T) => string;
  /** Optional header above the list (e.g. when list is inside Screen with title/filter, leave undefined). */
  listHeaderComponent?: React.ReactNode;
  /** When true, inserts month/year separator rows and uses getMonthYearKey to group. */
  groupByMonth?: boolean;
  /** Required when groupByMonth is true. Return "" or "future" to skip separator for that item. */
  getMonthYearKey?: (item: T) => string;
};

function buildGrouped<T>(
  data: T[],
  getMonthYearKey: (item: T) => string,
): CustomFlatListRow<T>[] {
  const grouped: CustomFlatListRow<T>[] = [];
  let currentMonthYear: string | null = null;

  for (const item of data) {
    const key = getMonthYearKey(item);
    const showSeparator = key && key !== "future" && key !== currentMonthYear;
    if (showSeparator) {
      currentMonthYear = key;
      grouped.push({
        type: "separator",
        monthYear: key,
        monthYearKey: key,
      });
    } else if (key && key !== "future") {
      currentMonthYear = key;
    }
    grouped.push({ type: "item", item });
  }
  return grouped;
}

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
  ...rest
}: CustomFlatListProps<T>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const flatData = useMemo(() => {
    if (groupByMonth && getMonthYearKey) {
      return buildGrouped(data, getMonthYearKey);
    }
    return data;
  }, [data, groupByMonth, getMonthYearKey]);

  const isGrouped = groupByMonth && getMonthYearKey;

  const listStyle = [styles.list];
  const contentStyle = [styles.listContent, contentContainerStyle];

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
          renderItem={({ item: row }) => {
            if (row.type === "separator") {
              return <MonthYearSeparator monthYear={row.monthYear} />;
            }
            return renderItem({ item: row.item });
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
          style={listStyle}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
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
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={ListEmptyComponent}
      {...rest}
    />
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    listWrap: { flex: 1 },
    list: { flex: 1 },
    listContent: {
      paddingBottom: insets.bottom,
    },
  });
