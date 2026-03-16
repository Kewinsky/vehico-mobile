export type ThemeMode = "light" | "dark";

export type AppTheme = {
  icons: {
    headerButton: number;
  };
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
    largeTitle: number;
    title: number;
    body: number;
    small: number;
    xs: number;
    fontWeight: {
      regular: "400";
      medium: "500";
      semibold: "600";
      bold: "700";
    };
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  titleMarginBottom: number;
  layout: {
    contentPaddingHorizontal: number;
  };
};

export const lightTheme: AppTheme = {
  icons: { headerButton: 20 },
  colors: {
    bg: "#FFFFFF", // pure white
    fg: "#000000", // pure black
    muted: "#666666", // gray
    border: "#E5E5E5", // light gray
    card: "#F5F5F5", // slightly lighter than bg in light mode
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
    lg: 24,
  },
  titleMarginBottom: 12,
  layout: {
    contentPaddingHorizontal: 12,
  },
  typography: {
    largeTitle: 28,
    title: 20,
    body: 16,
    small: 13,
    xs: 11,
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
};

export const darkTheme: AppTheme = {
  icons: lightTheme.icons,
  colors: {
    bg: "#000000", // pure black
    fg: "#FFFFFF", // pure white
    muted: "#999999", // light gray
    border: "#333333", // dark gray
    card: "#151515", // slightly lighter than bg in dark mode
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
