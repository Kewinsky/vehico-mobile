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
    bg: '#FFFFFF',
    fg: '#0B0B0B',
    muted: '#6B6B6B',
    border: '#E6E6E6',
    card: '#FFFFFF',
    accent: '#FFB803',
    danger: '#C1121F',
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
    md: 12,
  },
  typography: {
    title: 20,
    body: 16,
    small: 13,
  },
};

export const darkTheme: AppTheme = {
  colors: {
    bg: '#0B0B0B',
    fg: '#FFFFFF',
    muted: '#B0B0B0',
    border: '#222222',
    card: '#111111',
    accent: '#FFB803',
    danger: '#FF4D4D',
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  typography: lightTheme.typography,
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}


