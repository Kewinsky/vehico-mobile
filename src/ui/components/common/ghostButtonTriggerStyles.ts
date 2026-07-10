import type { AppTheme } from "../../theme";

export function ghostButtonTriggerStyles(theme: AppTheme) {
  return {
    wrap: {
      alignSelf: "stretch" as const,
      width: "100%" as const,
    },
    base: {
      height: theme.spacing.lg * 2,
      borderRadius: theme.radius.xl,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 0,
      alignSelf: "stretch" as const,
      width: "100%" as const,
      backgroundColor: theme.colors.card,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
      color: theme.colors.fg,
    },
  };
}
