export type FormInlineMenuPickerProps<T extends string> = {
  value: T;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
  disabled?: boolean;
  centered?: boolean;
};
