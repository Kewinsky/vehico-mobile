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
    // Modern "startup" neutrals
    bg: '#F8FAFC',      // slate-50
    fg: '#0F172A',      // slate-900
    muted: '#64748B',   // slate-500
    border: '#E2E8F0',  // slate-200
    card: '#FFFFFF',
    accent: '#2563EB',  // blue-600
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
    bg: '#0B1220',      // deep slate/navy
    fg: '#F8FAFC',      // slate-50
    muted: '#94A3B8',   // slate-400
    border: '#1E293B',  // slate-800
    card: '#0F172A',    // slate-900
    accent: '#3B82F6',  // blue-500
    danger: '#F87171',  // red-400
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  typography: lightTheme.typography,
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}


