import type { ReactNode } from "react";
import { useMemo } from "react";
import type { Insets, StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../../ThemeProvider";

type Props = {
  title: string;
  icon: ReactNode;
  onPress: () => void;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  titleColor?: string;
  titleNumberOfLines?: number;
  disabled?: boolean;
  hitSlop?: Insets;
  testID?: string;
  accessibilityLabel?: string;
};

export function Tile({
  title,
  icon,
  onPress,
  minHeight,
  style,
  titleColor,
  titleNumberOfLines = 2,
  disabled,
  hitSlop,
  testID,
  accessibilityLabel,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.tile,
        minHeight != null && { minHeight },
        pressed && !disabled && styles.tilePressed,
        disabled && styles.tileDisabled,
        style,
      ]}
    >
      {icon}
      <Text
        numberOfLines={titleNumberOfLines}
        style={[styles.tileTitle, titleColor ? { color: titleColor } : null]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileDisabled: {
      opacity: 0.5,
    },
    tileTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
  });
