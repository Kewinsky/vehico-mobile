import { HeaderButton } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";

import type { HeaderIconButtonProps } from "./HeaderIconButton.types";

export type { HeaderIconButtonProps } from "./HeaderIconButton.types";

/** iOS uses native bar button styling (glass on supported OS versions). */
export function HeaderIconButton({
  children,
  style,
  ...props
}: HeaderIconButtonProps) {
  return (
    <HeaderButton {...props} style={[styles.button, style]}>
      <View pointerEvents="none" style={styles.content}>
        {children}
      </View>
    </HeaderButton>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
});
