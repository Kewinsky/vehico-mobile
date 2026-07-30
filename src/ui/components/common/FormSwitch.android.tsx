import { useMemo } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { FormSwitchProps } from "./FormSwitch.types";

export function FormSwitch({
  value,
  onValueChange,
  disabled: isDisabled = false,
}: FormSwitchProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(), []);

  return (
    <View style={isDisabled ? styles.disabled : undefined}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={isDisabled}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.accent,
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    disabled: {
      opacity: 0.55,
    },
  });
