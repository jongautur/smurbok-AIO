// Re-export theme context — use useTheme() to get dynamic C for dark mode
export { useTheme, ThemeProvider, inputStyle, LIGHT, DARK } from './ThemeContext';
export type { Colors, ThemePref, ColorScheme } from './ThemeContext';

export const FONT = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const

export const SPACE = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const
