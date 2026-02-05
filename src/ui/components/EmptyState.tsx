import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

import { useTheme } from "../ThemeProvider";

type Props = {
  title: string;
  body?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({ title, body, actionLabel, onActionPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.fg }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: theme.colors.muted }]}>{body}</Text>
      ) : null}
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.action,
            {
              borderColor: theme.colors.accent,
              backgroundColor: "transparent",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: theme.colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      paddingTop: theme.spacing.lg * 1.5,
      paddingBottom: theme.spacing.lg * 1.5,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    body: {
      marginTop: theme.spacing.xs,
      lineHeight: theme.typography.body + 6,
    },
    action: {
      marginTop: theme.spacing.md,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 9999,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    actionText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
    },
  });

