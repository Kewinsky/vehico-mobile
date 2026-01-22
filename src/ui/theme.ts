export type ThemeMode = 'light' | 'dark';

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
  radius: {
    sm: number;
    md: number;
  };
  typography: {
    title: number;
    body: number;
    small: number;
  };
};

export const lightTheme: AppTheme = {
  colors: {
    bg: '#FFFFFF',      // pure white
    fg: '#000000',      // pure black
    muted: '#666666',   // gray
    border: '#E5E5E5',  // light gray
    card: '#FFFFFF',
    accent: '#FFB803',  // orange/yellow
    danger: '#EF4444',  // red-500
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 14,
  },
  typography: {
    title: 20,
    body: 16,
    small: 13,
  },
};

export const darkTheme: AppTheme = {
  colors: {
    bg: '#000000',      // pure black
    fg: '#FFFFFF',      // pure white
    muted: '#999999',   // light gray
    border: '#333333',  // dark gray
    card: '#000000',    // pure black
    accent: '#FFB803',  // orange/yellow
    danger: '#EF4444',  // red-500
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  typography: lightTheme.typography,
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}


