import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, Toggle } from "@expo/ui/swift-ui";
import { disabled, fixedSize, tint } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";

export type FormSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

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
        seedColor={theme.colors.accent}
        style={styles.host}
      >
        <Toggle
          isOn={value}
          onIsOnChange={onValueChange}
          modifiers={[
            fixedSize({ horizontal: true, vertical: true }),
            tint(theme.colors.accent),
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
