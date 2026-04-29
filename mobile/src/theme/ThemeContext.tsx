import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Palettes — mirrors web globals.css ───────────────────────────────────────

export const LIGHT = {
  bg:             '#f1f5f9', // slate-100 — slightly warmer than gray-50
  surface:        '#ffffff', // white
  surfaceRaised:  '#f8fafc', // slate-50 — elevated sections
  surfaceOverlay: '#ffffff',
  border:         '#e2e8f0', // slate-200
  borderSubtle:   '#f1f5f9', // slate-100 — hairline dividers
  borderStrong:   '#cbd5e1', // slate-300 — emphasized borders
  text:           '#0f172a', // slate-900
  muted:          '#64748b', // slate-500
  mutedLight:     '#94a3b8', // slate-400
  accent:         '#2563eb', // blue-600
  accentFg:       '#ffffff',
  accentSubtle:   '#eff6ff', // blue-50
  danger:         '#dc2626', // red-600
  dangerBg:       '#fef2f2', // red-50
  dangerSubtle:   '#fff1f2', // rose-50
  warning:        '#d97706', // amber-600
  warningBg:      '#fffbeb', // amber-50
  success:        '#16a34a', // green-600
  successBg:      '#f0fdf4', // green-50
  overlay:        'rgba(0,0,0,0.04)',
  inputBg:        '#ffffff',
  cardShadowColor: '#94a3b8', // slate-400 — soft light-mode shadow
} as const;

export const DARK = {
  bg:             '#020617', // slate-950
  surface:        '#0f172a', // slate-900
  surfaceRaised:  '#1e293b', // slate-800 — elevated sections
  surfaceOverlay: '#1e293b', // slate-800
  border:         '#1e293b', // slate-800
  borderSubtle:   '#0f172a', // slate-900 — hairline dividers
  borderStrong:   '#334155', // slate-700 — emphasized borders
  text:           '#f8fafc', // slate-50
  muted:          '#94a3b8', // slate-400
  mutedLight:     '#64748b', // slate-500
  accent:         '#3b82f6', // blue-500
  accentFg:       '#ffffff',
  accentSubtle:   'rgba(59,130,246,0.12)', // blue tint
  danger:         '#f87171', // red-400
  dangerBg:       'rgba(248,113,113,0.12)',
  dangerSubtle:   'rgba(251,113,133,0.10)',
  warning:        '#fbbf24', // amber-400
  warningBg:      'rgba(251,191,36,0.12)',
  success:        '#4ade80', // green-400
  successBg:      'rgba(74,222,128,0.12)',
  overlay:        'rgba(255,255,255,0.05)',
  inputBg:        '#1e293b',
  cardShadowColor: '#000000', // pure black — iOS shadow on dark bg
} as const;

export type Colors = { [K in keyof typeof LIGHT]: string };
export type ThemePref = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

interface ThemeState {
  C: Colors;
  pref: ThemePref;
  scheme: ColorScheme;
  setTheme: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeState>({
  C: LIGHT, pref: 'system', scheme: 'light', setTheme: () => {},
});

const PREF_KEY = 'smurbok_theme_pref';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [pref, setPref] = useState<ThemePref>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((p) => { if (p === 'light' || p === 'dark' || p === 'system') setPref(p as ThemePref); })
      .finally(() => setReady(true));
  }, []);

  const scheme: ColorScheme = pref === 'system' ? (systemScheme ?? 'light') : pref;
  const C: Colors = scheme === 'dark' ? DARK : LIGHT;

  function setTheme(p: ThemePref) {
    setPref(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  }

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ C, pref, scheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Shared input style factory — use as: <TextInput style={inputStyle(C)} />
export function inputStyle(C: Colors) {
  return {
    borderWidth: 1 as const,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.inputBg,
  };
}
