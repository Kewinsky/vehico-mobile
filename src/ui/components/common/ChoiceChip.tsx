import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "../../ThemeProvider";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

/** Hex color to rgba with alpha */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ChoiceChip({ label, selected, onPress, style }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const accentBg = hexToRgba(theme.colors.accent, 0.15);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          backgroundColor: selected ? accentBg : theme.colors.card,
        },
        pressed && { opacity: 0.9 },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? theme.colors.accent : theme.colors.muted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    chip: {
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.sm,
      minWidth: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
