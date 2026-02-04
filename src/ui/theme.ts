export type ThemeMode = "light" | "dark";

export type AppTheme = {
  colors: {
    bg: string;
    fg: string;
    muted: string;
    border: string;
    card: string;
    accent: string;
    danger: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    largeTitle: number; // iOS-style large page title
    title: number;
    body: number;
    small: number;
    xs: number; // badge, caption
  };
  radius: {
    xs: number; // checkbox, small corners
    sm: number;
    md: number;
  };
  /** Margin below large title (breathing room) */
  titleMarginBottom: number;
  /** Horizontal padding for screen content (title + main). Change here to adjust globally. */
  layout: {
    contentPaddingHorizontal: number;
  };
};

export const lightTheme: AppTheme = {
  colors: {
    bg: "#FFFFFF", // pure white
    fg: "#000000", // pure black
    muted: "#666666", // gray
    border: "#E5E5E5", // light gray
    card: "#FFFFFF",
    accent: "#FFB803", // orange/yellow
    danger: "#EF4444", // red-500
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    xs: 4,
    sm: 10,
    md: 17,
  },
  titleMarginBottom: 12,
  layout: {
    contentPaddingHorizontal: 12, // same as spacing.sm – change here for global content inset
  },
  typography: {
    largeTitle: 28,
    title: 20,
    body: 16,
    small: 13,
    xs: 11,
  },
};

export const darkTheme: AppTheme = {
  colors: {
    bg: "#0a0a0a", // soft black (iOS 26 style)
    fg: "#FFFFFF", // pure white
    muted: "#999999", // light gray
    border: "#333333", // dark gray
    card: "#000000", // pure black
    accent: "#FFB803", // orange/yellow
    danger: "#EF4444", // red-500
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  titleMarginBottom: lightTheme.titleMarginBottom,
  layout: lightTheme.layout,
  typography: lightTheme.typography,
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === "dark" ? darkTheme : lightTheme;
}
