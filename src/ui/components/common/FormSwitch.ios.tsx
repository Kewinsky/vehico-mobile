import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Switch as SwiftUISwitch } from "@expo/ui/swift-ui";
import { disabled, fixedSize } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import type { FormSwitchProps } from "./FormSwitch.types";

export type { FormSwitchProps } from "./FormSwitch.types";

export function FormSwitch({
  value,
  onValueChange,
  disabled: isDisabled = false,
}: FormSwitchProps) {
  const { theme, mode: themeMode } = useTheme();
  const styles = useMemo(() => makeStyles(), []);

  return (
    <View
      pointerEvents={isDisabled ? "none" : "auto"}
      style={isDisabled ? styles.disabled : undefined}
    >
      <Host
        matchContents={{ horizontal: true, vertical: true }}
        colorScheme={themeMode === "dark" ? "dark" : "light"}
        style={styles.host}
      >
        <SwiftUISwitch
          value={value}
          onValueChange={onValueChange}
          color={theme.colors.accent}
          modifiers={[
            fixedSize({ horizontal: true, vertical: true }),
            ...(isDisabled ? [disabled()] : []),
          ]}
        />
      </Host>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    host: {
      flexShrink: 0,
    },
    disabled: {
      opacity: 0.55,
    },
  });
