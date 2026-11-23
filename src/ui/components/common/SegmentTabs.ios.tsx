import { Host, Picker, Text } from "@expo/ui/swift-ui";
import {
  controlSize,
  frame,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import type { SegmentTabsProps } from "./SegmentTabs.types";

export type { SegmentTabsProps } from "./SegmentTabs.types";

export function SegmentTabs<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: SegmentTabsProps<T>) {
  const { theme, mode } = useTheme();

  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={mode}
      style={{ width: "100%", minHeight: 44 }}
    >
      <Picker
        label=""
        selection={value}
        onSelectionChange={onChange}
        modifiers={[
          pickerStyle("segmented"),
          controlSize(size === "sm" ? "regular" : "large"),
          tint(theme.colors.accent),
          frame({ minHeight: 44 }),
        ]}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
