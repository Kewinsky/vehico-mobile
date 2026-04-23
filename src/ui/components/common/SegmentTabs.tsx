import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "./ChoiceChip";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Array<Option<T>>;
  onChange: (next: T) => void;
  size?: "sm" | "md";
  variant?: Variant;
};

type Variant = "default" | "secondary";

export function SegmentTabs<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  variant = "default",
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme, variant), [theme, variant]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  const animatedIndex = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.timing(animatedIndex, {
      toValue: selectedIndex,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [animatedIndex, selectedIndex]);

  const wrapPadding = 3;
  const innerWidth = Math.max(0, containerWidth - wrapPadding * 2);
  const tabWidth = options.length > 0 ? innerWidth / options.length : 0;
  const translateX = Animated.multiply(animatedIndex, tabWidth);

  return (
    <View style={[styles.wrap]} onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: tabWidth,
              transform: [{ translateX }],
              borderColor: theme.colors.accent,
              backgroundColor: accentBg,
              left: wrapPadding,
              top: wrapPadding,
              bottom: wrapPadding,
            },
          ]}
        />
      ) : null}
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.tab,
              {
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                size === "sm" ? styles.textSm : styles.textMd,
                { color: selected ? theme.colors.accent : theme.colors.muted },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: any, variant: Variant) =>
  StyleSheet.create({
    wrap: {
      alignSelf: "stretch",
      width: "100%",
      minWidth: 0,
      flexDirection: "row",
      borderRadius: theme.radius.md,
      padding: 3,
      backgroundColor:
        variant === "secondary" ? theme.colors.card : theme.colors.bg,
    },
    tab: {
      flex: 1,
      borderRadius: theme.radius.md - 2,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    thumb: {
      position: "absolute",
      borderRadius: theme.radius.md - 2,
      borderWidth: 1,
    },
    textMd: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    textSm: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
