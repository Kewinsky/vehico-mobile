import { StyleSheet, View } from "react-native";
import type { ViewProps, ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Children, useMemo } from "react";

import { useTheme } from "../../ThemeProvider";

type CardProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
  withoutDividers?: boolean;
  children?: ReactNode;
};

export function Card({
  style,
  withoutDividers = false,
  children,
  ...rest
}: CardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const content =
    withoutDividers || !children
      ? children
      : (() => {
          const items = Children.toArray(children);
          const spaced: ReactNode[] = [];
          items.forEach((child, index) => {
            if (index > 0) {
              spaced.push(<CardDivider key={`divider-${index}`} />);
            }
            spaced.push(child);
          });
          return spaced;
        })();

  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

export function CardDivider() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
      }}
    />
  );
}

type CardRowProps = ViewProps & {
  style?: ViewStyle | ViewStyle[];
};

export function CardRow({ style, ...rest }: CardRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <View {...rest} style={[styles.row, style]} />;
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
  });
