export function buildMenuPickerState<T extends string>({
  value,
  options,
  getLabel,
  placeholderLabel,
  mutedValues,
}: {
  value: T | null;
  options: readonly T[];
  getLabel: (value: T) => string;
  placeholderLabel?: string;
  mutedValues?: readonly T[];
}) {
  const pickerOptions = placeholderLabel
    ? [placeholderLabel, ...options.map(getLabel)]
    : options.map(getLabel);

  const selectedIndex = (() => {
    if (placeholderLabel) {
      if (value === null) return 0;
      const index = options.indexOf(value);
      return index >= 0 ? index + 1 : 0;
    }
    if (value === null) return 0;
    const index = options.indexOf(value);
    return index >= 0 ? index : 0;
  })();

  const isValueMuted =
    (placeholderLabel != null && value === null) ||
    (value != null && (mutedValues?.includes(value) ?? false));

  const handleSelectIndex = (index: number): T | null => {
    if (placeholderLabel) {
      return index === 0 ? null : (options[index - 1] ?? null);
    }
    return options[index] ?? null;
  };

  return {
    pickerOptions,
    selectedIndex,
    isValueMuted,
    handleSelectIndex,
  };
}
