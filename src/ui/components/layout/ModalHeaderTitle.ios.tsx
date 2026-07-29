import { Text } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { ModalHeaderTitleProps } from "./ModalHeaderTitle.types";

export type { ModalHeaderTitleProps } from "./ModalHeaderTitle.types";

/** iOS keeps the native large/title bar styling. */
export function ModalHeaderTitle({ children }: ModalHeaderTitleProps) {
  const { theme } = useTheme();

  if (!children) return null;

  return (
    <Text
      numberOfLines={1}
      style={{
        color: theme.colors.fg,
        fontWeight: theme.typography.fontWeight.bold,
        fontSize: theme.typography.title,
      }}
    >
      {children}
    </Text>
  );
}
