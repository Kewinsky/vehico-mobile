import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { CustomFlatList } from "../../ui/components/list/CustomFlatList.ios";
import { SwipeableListRow } from "../../ui/components/list/SwipeableListRow.ios";

jest.mock("../../ui/ThemeProvider", () => ({
  useTheme: () => ({
    mode: "light",
    theme: jest.requireActual("../../ui/theme").lightTheme,
  }),
}));
jest.mock("../../ui/components/list/MonthYearSeparator", () => ({
  MonthYearSeparator: () => null,
}));
jest.mock("../../ui/components/list/SwipeableListRow.fallback", () => ({
  SwipeableListRow: ({ children }: { children: import("react").ReactNode }) => {
    const { View } = jest.requireActual("react-native");
    return <View testID="fallback-row">{children}</View>;
  },
}));
jest.mock("@expo/ui/swift-ui", () => {
  const { View, Text, Pressable } = jest.requireActual("react-native");
  const Container = ({ children }: { children: import("react").ReactNode }) => (
    <View>{children}</View>
  );
  const List = Object.assign(Container, {
    // Reuse one slot, as the native list does when a different item enters the window.
    ForEach: ({ data, children }: {
      data: unknown[];
      children: (info: { item: unknown; index: number }) => import("react").ReactNode;
    }) => <View>{children({ item: data[0], index: 0 })}</View>,
  });
  return {
    Host: Container,
    List,
    RNHostView: Container,
    VStack: Container,
    SwipeActions: Object.assign(Container, { Actions: Container }),
    Button: ({ children, onPress }: {
      children: import("react").ReactNode;
      onPress: () => void;
    }) => <Pressable accessibilityRole="button" onPress={onPress}>{children}</Pressable>,
    Label: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  foregroundStyle: () => ({}),
  labelStyle: () => ({}),
  listRowBackground: () => ({}),
  listRowInsets: () => ({}),
  listRowSeparator: () => ({}),
  listStyle: () => ({}),
  refreshable: () => ({}),
  scrollContentBackground: () => ({}),
  tint: () => ({}),
}));

function StatefulRow({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SwipeableListRow actions={[{
      accessibilityLabel: "Delete",
      systemImage: "trash",
      color: "red",
      icon: <View />,
      onPress: () => onDelete(id),
    }]}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <Text>{id}</Text>
      </Pressable>
      {expanded ? <Text>Details {id}</Text> : null}
    </SwipeableListRow>
  );
}

describe("native list rows", () => {
  it("resets row state and binds actions to the new item when a slot is recycled", () => {
    const onDelete = jest.fn();
    const screen = (id: string) => (
      <CustomFlatList
        nativeRows
        data={[{ id }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StatefulRow id={item.id} onDelete={onDelete} />}
      />
    );
    const { getByText, queryByText, rerender } = render(screen("A"));
    fireEvent.press(getByText("A"));
    expect(getByText("Details A")).toBeTruthy();

    rerender(screen("B"));
    expect(queryByText("Details A")).toBeNull();
    expect(queryByText("Details B")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.press(getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("B");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("keeps embedded React Native content outside the native row context", () => {
    const { getByTestId, getByText, queryByText } = render(
      <CustomFlatList
        data={[{ id: "A" }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StatefulRow id={item.id} onDelete={jest.fn()} />}
      />,
    );
    expect(getByTestId("fallback-row")).toBeTruthy();
    expect(getByText("A")).toBeTruthy();
    expect(queryByText("Delete")).toBeNull();
  });
});
