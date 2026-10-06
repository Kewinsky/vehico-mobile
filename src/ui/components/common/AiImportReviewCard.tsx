import { StyleSheet, Text, type ViewStyle } from "react-native";

import { useTheme } from "../../ThemeProvider";
import { Card } from "./Card";

type Props = {
  message: string;
  style?: ViewStyle;
};

export function AiImportReviewCard({ message, style }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <Card withoutDividers style={style ? [styles.card, style] : styles.card}>
      <Text style={[styles.text, { color: theme.colors.fg }]}>{message}</Text>
    </Card>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: `${theme.colors.accent}20`,
    },
    text: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
    },
  });
