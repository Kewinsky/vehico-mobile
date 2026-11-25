import { useContext } from "react";
import { View } from "react-native";
import { Button, Label, RNHostView, SwipeActions } from "@expo/ui/swift-ui";
import {
  foregroundStyle,
  labelStyle,
  listRowBackground,
  listRowInsets,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { NativeListContext } from "./NativeListContext";
import { SwipeableListRow as FallbackRow } from "./SwipeableListRow.fallback";
import type { SwipeableListRowProps } from "./SwipeableListRow.types";

export function SwipeableListRow(props: SwipeableListRowProps) {
  const nativeList = useContext(NativeListContext);
  const { theme } = useTheme();

  if (!nativeList) return <FallbackRow {...props} />;

  return (
    <SwipeActions
      modifiers={[
        listRowBackground(theme.colors.card),
        listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
      ]}
    >
      <RNHostView matchContents={{ vertical: true }}>
        <NativeListContext.Provider value={false}>
          <View style={{ width: "100%" }}>{props.children}</View>
        </NativeListContext.Provider>
      </RNHostView>
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
        {/* SwiftUI lays trailing actions out from right to left. */}
        {[...props.actions].reverse().map((action) => (
          <Button
            key={action.accessibilityLabel}
            onPress={action.onPress}
            modifiers={[tint(action.color), labelStyle("iconOnly")]}
          >
            {/* Confirmation stays in the handler; a destructive role hides the row early. */}
            <Label
              title={action.accessibilityLabel}
              systemImage={action.systemImage}
              modifiers={[foregroundStyle("#000000")]}
            />
          </Button>
        ))}
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
