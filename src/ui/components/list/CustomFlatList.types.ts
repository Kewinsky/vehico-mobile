import type { ReactElement, ReactNode } from "react";
import type { FlatListProps } from "react-native";

export type CustomFlatListRow<T> =
  | { type: "separator"; monthYear: string; monthYearKey: string }
  | { type: "item"; item: T };

export type CustomFlatListProps<T> = Omit<
  FlatListProps<T>,
  "data" | "renderItem" | "keyExtractor" | "ListHeaderComponent" | "ListEmptyComponent"
> & {
  data: T[];
  renderItem: (info: { item: T }) => ReactElement | null;
  keyExtractor: (item: T) => string;
  ListEmptyComponent?: ReactElement;
  listHeaderComponent?: ReactNode;
  groupByMonth?: boolean;
  getMonthYearKey?: (item: T) => string;
  /** The renderer returns SwipeableListRow, which supplies the SwiftUI row boundary. */
  nativeRows?: boolean;
};
