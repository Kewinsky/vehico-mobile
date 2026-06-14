import { useMemo, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

const SWIPE_ACTION_DELAY = 0.35;
const SWIPE_ACTION_STAGGER = 0.5;

export type SwipeActionConfig = {
  onPress: () => void;
  color: string;
  icon: ReactNode;
  accessibilityLabel?: string;
};

type SwipeActionProps = {
  progress: Animated.AnimatedInterpolation<number>;
  /** 0 = revealed first (closest to the swiped edge). */
  revealIndex: number;
  actionCount: number;
  onPress: () => void;
  color: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

function getRevealRange(revealIndex: number, actionCount: number) {
  if (actionCount <= 1) {
    return { start: SWIPE_ACTION_DELAY, end: 1 };
  }

  const window = 1 - SWIPE_ACTION_DELAY - SWIPE_ACTION_STAGGER;
  const start = SWIPE_ACTION_DELAY + revealIndex * SWIPE_ACTION_STAGGER;
  const end = Math.min(1, start + window);
  return { start, end };
}

/**
 * Staggered swipe action: each button scales in over its own slice of swipe
 * progress so further dragging reveals the next button one after another.
 */
export function SwipeAction({
  progress,
  revealIndex,
  actionCount,
  onPress,
  color,
  accessibilityLabel,
  style,
  children,
}: SwipeActionProps) {
  const { start, end } = getRevealRange(revealIndex, actionCount);
  const inputRange = [start, end];

  const opacity = progress.interpolate({
    inputRange,
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const scale = progress.interpolate({
    inputRange,
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={[style, { backgroundColor: color }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

type SwipeActionsRowProps = {
  progress: Animated.AnimatedInterpolation<number>;
  /** Left-to-right; the rightmost action is revealed first on swipe. */
  actions: SwipeActionConfig[];
  style?: StyleProp<ViewStyle>;
};

export function SwipeActionsRow({
  progress,
  actions,
  style,
}: SwipeActionsRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (actions.length === 0) return null;

  return (
    <View style={[styles.wrap, style]}>
      {actions.map((action, index) => (
        <SwipeAction
          key={`${action.accessibilityLabel ?? "action"}-${index}`}
          progress={progress}
          revealIndex={actions.length - 1 - index}
          actionCount={actions.length}
          onPress={action.onPress}
          color={action.color}
          accessibilityLabel={action.accessibilityLabel}
          style={styles.button}
        >
          {action.icon}
        </SwipeAction>
      ))}
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    button: {
      width: 48,
      height: 48,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
  });
