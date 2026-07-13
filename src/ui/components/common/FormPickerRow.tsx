import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import type { ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FormMenuPickerRow } from "./FormMenuPickerRow";
import { buildMenuPickerState } from "./menuPickerState";

export type FormPickerRowProps<T extends string> = {
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconComponent?: ReactNode;
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T | null) => void;
  placeholderLabel?: string;
  mutedValues?: readonly T[];
  error?: boolean;
  disabled?: boolean;
  rowStyle?: ViewStyle;
};

export function FormPickerRow<T extends string>({
  icon,
  iconComponent,
  label,
  value,
  options,
  getLabel,
  onChange,
  placeholderLabel,
  mutedValues,
  error = false,
  disabled = false,
  rowStyle,
}: FormPickerRowProps<T>) {
  const { pickerOptions, selectedIndex, isValueMuted, handleSelectIndex } =
    useMemo(
      () =>
        buildMenuPickerState({
          value,
          options,
          getLabel,
          placeholderLabel,
          mutedValues,
        }),
      [value, options, getLabel, placeholderLabel, mutedValues],
    );

  return (
    <FormMenuPickerRow
      icon={icon}
      iconComponent={iconComponent}
      label={label}
      options={pickerOptions}
      selectedIndex={selectedIndex}
      isValueMuted={isValueMuted}
      onOptionSelected={(index) => {
        onChange(handleSelectIndex(index));
      }}
      error={error}
      disabled={disabled}
      rowStyle={rowStyle}
    />
  );
}
