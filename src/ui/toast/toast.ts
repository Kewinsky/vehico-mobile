import { Toast } from "toastify-react-native";

type ThemeColors = {
  bg: string;
  fg: string;
  accent: string;
  danger: string;
  muted: string;
};

// Helper to get theme colors (imported dynamically to avoid circular dependency)
let getThemeColors: (() => ThemeColors) | null = null;

export function setThemeColorsGetter(getter: () => ThemeColors): void {
  getThemeColors = getter;
}

function getColors(): ThemeColors {
  if (getThemeColors) {
    return getThemeColors();
  }
  // Fallback colors if theme not available
  return {
    bg: "#FFFFFF",
    fg: "#000000",
    accent: "#FFB803",
    danger: "#EF4444",
    muted: "#666666",
  };
}

export function toastInfo(title: string, description?: string) {
  const colors = getColors();
  Toast.show({
    type: "info",
    text1: title,
    text2: description || undefined,
    backgroundColor: colors.bg,
    textColor: colors.fg,
    iconColor: colors.accent,
  });
}

export function toastSuccess(title: string, description?: string) {
  const colors = getColors();
  Toast.show({
    type: "success",
    text1: title,
    text2: description || undefined,
    backgroundColor: colors.bg,
    textColor: colors.fg,
    iconColor: colors.accent,
  });
}

export function toastError(title: string, description?: string) {
  const colors = getColors();
  Toast.show({
    type: "error",
    text1: title,
    text2: description || undefined,
    backgroundColor: colors.bg,
    textColor: colors.fg,
    iconColor: colors.danger,
  });
}
