import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Picker as SwiftUIPicker } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { supportsExpoSwiftUI } from "../../platform/expoSwiftUi";
import { SegmentTabsFallback } from "./SegmentTabs.fallback";
import type { SegmentTabsProps } from "./SegmentTabs.types";

export type { SegmentTabsProps } from "./SegmentTabs.types";

const NATIVE_SEGMENT_HEIGHT = 44;

function supportsNativeSegmentTabs() {
  return supportsExpoSwiftUI();
}

export function SegmentTabs<T extends string>(props: SegmentTabsProps<T>) {
  const { value, options, onChange, preferFallback = false } = props;
  const { mode: themeMode } = useTheme();
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

  if (preferFallback || !supportsNativeSegmentTabs()) {
    return <SegmentTabsFallback {...props} />;
  }

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
