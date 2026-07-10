import { useMemo } from "react";
import { Platform, Switch as RNSwitch, StyleSheet, View } from "react-native";
import { Host, Toggle } from "@expo/ui/swift-ui";
import { disabled, fixedSize } from "@expo/ui/swift-ui/modifiers";
import { Switch as ComposeSwitch } from "@expo/ui/jetpack-compose";

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

  if (Platform.OS === "ios") {
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
          <Toggle
            isOn={value}
            onIsOnChange={onValueChange}
            modifiers={[
              fixedSize({ horizontal: true, vertical: true }),
              ...(isDisabled ? [disabled()] : []),
            ]}
          />
        </Host>
      </View>
    );
  }

  if (Platform.OS === "android") {
    return (
      <View
        pointerEvents={isDisabled ? "none" : "auto"}
        style={isDisabled ? styles.disabled : undefined}
      >
        <ComposeSwitch
          value={value}
          enabled={!isDisabled}
          onCheckedChange={onValueChange}
          colors={{
            checkedTrackColor: theme.colors.accent,
            uncheckedTrackColor: theme.colors.border,
            checkedThumbColor: "#fff",
            uncheckedThumbColor: "#fff",
          }}
        />
      </View>
    );
  }

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={isDisabled}
      trackColor={{
        false: theme.colors.border,
        true: theme.colors.accent,
      }}
      thumbColor="#fff"
    />
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
