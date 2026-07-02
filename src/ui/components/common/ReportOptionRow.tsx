import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CircleHelp } from "lucide-react-native";

import { useTheme } from "../../ThemeProvider";

type Props = {
  label: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  infoTitle?: string;
  infoBody?: string;
  unavailableTitle?: string;
  unavailableBody?: string;
  isLast?: boolean;
};

export function ReportOptionRow({
  label,
  checked,
  onPress,
  disabled,
  infoTitle,
  infoBody,
  unavailableTitle,
  unavailableBody,
  isLast,
}: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const showUnavailableAlert = () => {
    if (!unavailableTitle && !unavailableBody) return;
    Alert.alert(unavailableTitle ?? label, unavailableBody ?? "");
  };

  const showInfoAlert = () => {
    const parts = [infoBody, disabled && unavailableBody].filter(Boolean);
    const body = parts.join("\n\n");
    if (!body) {
      showUnavailableAlert();
      return;
    }
    Alert.alert(infoTitle ?? label, body);
  };

  const toggle = () => {
    if (disabled) {
      showUnavailableAlert();
      return;
    }
    onPress();
  };

  const showInfoButton =
    (infoTitle && infoBody) || (disabled && unavailableBody);

  return (
    <View style={[styles.row, disabled && styles.rowDisabled, isLast && styles.rowLast]}>
      <View style={styles.labelGroup}>
        <Pressable
          style={styles.labelPressable}
          onPress={toggle}
          disabled={disabled && !unavailableBody && !unavailableTitle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled: !!disabled }}
        >
          <Text
            style={[styles.label, disabled && { color: theme.colors.muted }]}
          >
            {label}
          </Text>
        </Pressable>
        {showInfoButton ? (
          <Pressable
            onPress={showInfoAlert}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={infoTitle ?? unavailableTitle ?? label}
            style={styles.infoButton}
          >
            <CircleHelp size={18} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={toggle}
        disabled={disabled && !unavailableBody && !unavailableTitle}
        hitSlop={4}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: !!disabled }}
      >
        <Ionicons
          name={checked ? "checkbox" : "checkbox-outline"}
          size={24}
          color={
            disabled
              ? theme.colors.muted
              : checked
                ? theme.colors.accent
                : theme.colors.muted
          }
        />
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    rowLast: {
      marginBottom: 0,
    },
    rowDisabled: { opacity: 0.7 },
    labelGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    labelPressable: {
      flexShrink: 1,
      minWidth: 0,
    },
    label: {
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
    infoButton: {
      padding: 2,
      flexShrink: 0,
    },
  });
