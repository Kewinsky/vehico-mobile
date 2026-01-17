import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../ThemeProvider";
import { TextField } from "./TextField";

type Props<T extends string> = {
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  noMarginTop?: boolean;
  placeholder?: string;
};

export function PickerField<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
  disabled,
  noMarginTop,
  placeholder,
}: Props<T>) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handlePress = () => {
    if (disabled) return;

    const buttons: Array<{ text: string; onPress?: () => void; style?: "cancel" | "default" | "destructive" }> = [
      { text: t("common.cancel"), style: "cancel" },
    ];

    if (placeholder) {
      buttons.push({
        text: placeholder,
        onPress: () => onChange(null),
      });
    }

    options.forEach((opt) => {
      buttons.push({
        text: getLabel(opt),
        onPress: () => onChange(opt),
      });
    });

    Alert.alert(label, "", buttons, { cancelable: true });
  };

  return (
    <View>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && !disabled ? { opacity: 0.95 } : null,
        ]}
      >
        <TextField
          noMarginTop={noMarginTop}
          label={label}
          value={value ? getLabel(value) : placeholder || ""}
          editable={false}
          pointerEvents="none"
        />
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({});
