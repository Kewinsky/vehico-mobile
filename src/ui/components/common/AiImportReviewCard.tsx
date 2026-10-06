import { StyleSheet, Text, type ViewStyle } from "react-native";

import { useTheme } from "../../ThemeProvider";
import { Card } from "./Card";

export type AiImportReviewTone = "success" | "review";

type Props = {
  message: string;
  tone?: AiImportReviewTone;
  style?: ViewStyle;
};

const SUCCESS_GREEN = "#22C55E";

export function AiImportReviewCard({
  message,
  tone = "review",
  style,
}: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const backgroundColor =
    tone === "success" ? `${SUCCESS_GREEN}20` : `${theme.colors.accent}20`;

  return (
    <Card
      withoutDividers
      style={[styles.card, { backgroundColor }, style]}
    >
      <Text style={[styles.text, { color: theme.colors.fg }]}>{message}</Text>
    </Card>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    text: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
    },
  });
