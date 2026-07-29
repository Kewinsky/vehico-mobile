import type { ReactNode } from "react";
import { ActivityIndicator, Text } from "react-native";
import { HeaderIconButton } from "./HeaderIconButton";
import { Check, X } from "lucide-react-native";

import { useTheme } from "../../ThemeProvider";

type ModalButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  variant?: "cancel" | "done";
  children?: ReactNode;
  loading?: boolean;
};

export function ModalButton({
  onPress,
  disabled = false,
  variant,
  children,
  loading = false,
}: ModalButtonProps) {
  const { theme } = useTheme();
  const iconSize = 20;

  const a11yLabel = typeof children === "string" ? children : undefined;

  if (variant === "cancel") {
    return (
      <HeaderIconButton
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={a11yLabel}
        tintColor={theme.colors.fg}
      >
        <X size={iconSize} color={theme.colors.fg} />
      </HeaderIconButton>
    );
  }

  if (variant === "done") {
    return (
      <HeaderIconButton
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityLabel={a11yLabel}
        tintColor={theme.colors.accent}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : (
          <Check size={iconSize} color={theme.colors.accent} />
        )}
      </HeaderIconButton>
    );
  }

  return (
    <HeaderIconButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={a11yLabel}
      tintColor={theme.colors.accent}
    >
      <Text style={{ color: theme.colors.accent }}>{children}</Text>
    </HeaderIconButton>
  );
}
