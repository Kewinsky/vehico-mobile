import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { ModalHeaderTitleProps } from "./ModalHeaderTitle.types";

export type { ModalHeaderTitleProps } from "./ModalHeaderTitle.types";

const CHIP_HEIGHT = 40;

/** Pill matching HeaderIconButton surface so titles read clearly over transparent headers. */
export function ModalHeaderTitle({ children }: ModalHeaderTitleProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!children) return null;

  return (
    <View style={styles.chip}>
      <Text style={styles.text} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const makeStyles = (theme: {
  colors: { card: string; border: string; fg: string };
  typography: {
    body: number;
    fontWeight: { bold: "700" | "bold" | string };
  };
  spacing: { sm: number; md: number };
}) =>
  StyleSheet.create({
    chip: {
      height: CHIP_HEIGHT,
      maxWidth: "100%",
      paddingHorizontal: theme.spacing.md,
      borderRadius: CHIP_HEIGHT / 2,
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
    },
    text: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold as any,
      textAlign: "center",
    },
  });
