import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker as ComposePicker } from "@expo/ui/jetpack-compose";
import { Host, Picker as SwiftUIPicker } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "./ChoiceChip";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  size?: "sm" | "md";
  variant?: Variant;
  /** Use Pressable tabs instead of native segmented control. */
  preferFallback?: boolean;
};

type Variant = "default" | "secondary";

const IOS_MIN_VERSION = 17;

function supportsNativeSegmentTabs() {
  if (Platform.OS === "android") return true;
  if (Platform.OS === "ios") {
    return Number.parseFloat(String(Platform.Version)) >= IOS_MIN_VERSION;
  }
  return false;
}

function SegmentTabsFallback<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  variant = "default",
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(
    () => makeFallbackStyles(theme, variant),
    [theme, variant],
  );
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
    <View
      style={styles.wrap}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
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

const NATIVE_SEGMENT_HEIGHT = 44;

export function SegmentTabs<T extends string>(props: Props<T>) {
  const { value, options, onChange, variant = "default", preferFallback = false } =
    props;
  const { theme, mode: themeMode } = useTheme();
  const styles = useMemo(() => makeNativeStyles(), []);

  const pickerOptions = useMemo(
    () => options.map((option) => option.label),
    [options],
  );
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const handleSelect = useCallback(
    (index: number) => {
      const next = options[index];
      if (next && next.value !== value) {
        onChange(next.value);
      }
    },
    [onChange, options, value],
  );

  const androidElementColors = useMemo(
    () => ({
      activeContainerColor: hexToRgba(theme.colors.accent, 0.15),
      activeContentColor: theme.colors.accent,
      activeBorderColor: theme.colors.accent,
      inactiveContainerColor:
        variant === "secondary" ? theme.colors.card : theme.colors.bg,
      inactiveContentColor: theme.colors.muted,
      inactiveBorderColor: theme.colors.border,
    }),
    [theme, variant],
  );

  if (preferFallback || !supportsNativeSegmentTabs()) {
    return <SegmentTabsFallback {...props} />;
  }

  if (Platform.OS === "ios") {
    return (
      <View style={styles.wrap}>
        <Host
          matchContents={{ vertical: true }}
          colorScheme={themeMode === "dark" ? "dark" : "light"}
          style={styles.nativeHost}
        >
          <SwiftUIPicker
            variant="segmented"
            options={pickerOptions}
            selectedIndex={selectedIndex}
            onOptionSelected={({ nativeEvent }) => {
              handleSelect(nativeEvent.index);
            }}
            modifiers={[frame({ maxWidth: 10_000 })]}
          />
        </Host>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ComposePicker
        variant="segmented"
        style={styles.nativeHost}
        options={pickerOptions}
        selectedIndex={selectedIndex}
        elementColors={androidElementColors}
        onOptionSelected={({ nativeEvent }) => {
          handleSelect(nativeEvent.index);
        }}
      />
    </View>
  );
}

const makeNativeStyles = () =>
  StyleSheet.create({
    wrap: {
      alignSelf: "stretch",
      width: "100%",
      minWidth: 0,
      minHeight: NATIVE_SEGMENT_HEIGHT,
    },
    nativeHost: {
      width: "100%",
      minHeight: NATIVE_SEGMENT_HEIGHT,
      alignSelf: "stretch",
    },
  });

const makeFallbackStyles = (theme: any, variant: Variant) =>
  StyleSheet.create({
    wrap: {
      alignSelf: "stretch",
      width: "100%",
      minWidth: 0,
      flexDirection: "row",
      borderRadius: 999,
      padding: 3,
      backgroundColor:
        variant === "secondary" ? theme.colors.card : theme.colors.bg,
    },
    tab: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: theme.spacing.xs - 2,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    thumb: {
      position: "absolute",
      borderRadius: 999,
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
