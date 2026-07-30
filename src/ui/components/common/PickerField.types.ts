export type PickerFieldProps<T extends string> = {
  label: string;
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  noMarginTop?: boolean;
  placeholder?: string;
};
