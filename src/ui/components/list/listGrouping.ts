import type { CustomFlatListRow } from "./CustomFlatList.types";

export function buildGrouped<T>(
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

