import { Fragment, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Host, List, RNHostView, VStack } from "@expo/ui/swift-ui";
import {
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listStyle,
  refreshable,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { MonthYearSeparator } from "./MonthYearSeparator";
import { NativeListContext } from "./NativeListContext";
import { buildGrouped } from "./listGrouping";
import type { CustomFlatListProps, CustomFlatListRow } from "./CustomFlatList.types";

export type { CustomFlatListRow } from "./CustomFlatList.types";

function ContentRow({ children }: { children: ReactNode }) {
  return (
    <VStack
      modifiers={[
        listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
        listRowBackground("transparent"),
        listRowSeparator("hidden"),
      ]}
    >
      <RNHostView matchContents={{ vertical: true }}>
        <NativeListContext.Provider value={false}>
          <View style={{ width: "100%" }}>{children}</View>
        </NativeListContext.Provider>
      </RNHostView>
    </VStack>
  );
}

export function CustomFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  listHeaderComponent,
  ListEmptyComponent,
  groupByMonth = false,
  getMonthYearKey,
  nativeRows = false,
  onRefresh,
  style,
}: CustomFlatListProps<T>) {
  const { theme, mode } = useTheme();
  const rows = useMemo<CustomFlatListRow<T>[]>(
    () =>
      groupByMonth && getMonthYearKey
        ? buildGrouped(data, getMonthYearKey)
        : data.map((item) => ({ type: "item", item })),
    [data, groupByMonth, getMonthYearKey],
  );
  const rowKey = useCallback(
    (row: CustomFlatListRow<T>) =>
      row.type === "separator"
        ? `month:${row.monthYearKey}`
        : `item:${keyExtractor(row.item)}`,
    [keyExtractor],
  );
  const renderRow = useCallback(
    ({ item: row, index }: { item: CustomFlatListRow<T>; index: number }) => {
      if (row.type === "separator") {
        return (
          <ContentRow>
            <MonthYearSeparator isFirst={index === 0} monthYear={row.monthYear} />
          </ContentRow>
        );
      }
      const content = renderItem({ item: row.item });
      // Recycled slots must not carry expanded state or image state to another item.
      return (
        <Fragment key={keyExtractor(row.item)}>
          {nativeRows ? content : <ContentRow>{content}</ContentRow>}
        </Fragment>
      );
    },
    [renderItem, keyExtractor, nativeRows],
  );
  let content: ReactNode;
  if (rows.length === 0) {
    content = ListEmptyComponent ? <ContentRow>{ListEmptyComponent}</ContentRow> : null;
  } else {
    content = (
      <List.ForEach data={rows} keyExtractor={rowKey} estimatedItemSize={100}>
        {renderRow}
      </List.ForEach>
    );
  }

  return (
    <NativeListContext.Provider value>
      <Host
        colorScheme={mode}
        seedColor={theme.colors.accent}
        style={[
          { flex: 1, marginHorizontal: -theme.layout.contentPaddingHorizontal },
          style,
        ]}
      >
        <List
          modifiers={[
            listStyle("insetGrouped"),
            scrollContentBackground("hidden"),
            ...(onRefresh
              ? [refreshable(async () => { await onRefresh(); })]
              : []),
          ]}
        >
          {listHeaderComponent ? <ContentRow>{listHeaderComponent}</ContentRow> : null}
          {content}
        </List>
      </Host>
    </NativeListContext.Provider>
  );
}
