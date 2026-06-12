import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { Trans } from "react-i18next";

import { useTheme } from "../../ThemeProvider";

type Props = {
  i18nKey: string;
  values?: Record<string, unknown>;
  /** `block` = standalone line; `inline` = nested inside another Text. */
  variant?: "block" | "inline";
};

export function RichCalloutText({
  i18nKey,
  values,
  variant = "block",
}: Props): ReactNode {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const trans = (
    <Trans
      i18nKey={i18nKey}
      values={values}
      components={{
        bold: <Text style={styles.bold} />,
      }}
    />
  );

  if (variant === "block") {
    return <Text style={styles.block}>{trans}</Text>;
  }

  return trans;
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    block: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.small + 4,
      color: theme.colors.muted,
    },
    bold: {
      color: theme.colors.muted,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
