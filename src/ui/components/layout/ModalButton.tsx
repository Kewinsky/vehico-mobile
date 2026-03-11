import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";

const ICON_SIZE = 20;

type ModalButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  variant?: "cancel" | "done";
  children?: ReactNode;
};

/**
 * Buttons for native modal header (headerLeft / headerRight).
 * Uses HeaderButton from @react-navigation/elements for native-style layout and feedback.
 * Use variant="cancel" / "done" for iOS-style tick and cross icons; otherwise renders children as text.
 */
export function ModalButton({
  onPress,
  disabled = false,
  variant,
  children,
}: ModalButtonProps) {
  const { theme } = useTheme();

  const a11yLabel = typeof children === "string" ? children : undefined;

  if (variant === "cancel") {
    return (
      <HeaderButton
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={a11yLabel}
        tintColor={theme.colors.fg}
      >
        <Ionicons
          name="close-outline"
          size={ICON_SIZE}
          color={theme.colors.fg}
        />
      </HeaderButton>
    );
  }

  if (variant === "done") {
    return (
      <HeaderButton
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={a11yLabel}
        tintColor={theme.colors.accent}
      >
        <Ionicons
          name="checkmark"
          size={ICON_SIZE}
          color={theme.colors.accent}
        />
      </HeaderButton>
    );
  }

  return (
    <HeaderButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={a11yLabel}
      tintColor={theme.colors.accent}
    >
      <Text style={{ color: theme.colors.accent }}>{children}</Text>
    </HeaderButton>
  );
}
