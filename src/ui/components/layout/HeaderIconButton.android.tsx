import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { HeaderButton } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";
import type { HeaderIconButtonProps } from "./HeaderIconButton.types";

export type { HeaderIconButtonProps } from "./HeaderIconButton.types";

const BUTTON_SIZE = 40;

/** Material-style circular surface for toolbar icons over transparent headers. */
export function HeaderIconButton({
  style,
  ...props
}: HeaderIconButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.surface}>
      <HeaderButton
        {...props}
        style={[styles.button, style]}
      />
    </View>
  );
}

const makeStyles = (theme: {
  colors: { card: string; border: string };
}) =>
  StyleSheet.create({
    surface: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 2,
    },
    button: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      paddingHorizontal: 0,
      alignItems: "center",
      justifyContent: "center",
    },
  });
