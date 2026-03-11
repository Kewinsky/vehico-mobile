import type { ReactNode } from "react";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";

import { useTheme } from "../../ThemeProvider";

type ModalButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  variant?: "cancel" | "done";
  children?: ReactNode;
};

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
          size={theme.icons.headerButton}
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
          size={theme.icons.headerButton}
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
