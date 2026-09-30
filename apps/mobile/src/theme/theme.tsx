/**
 * Theme: the palette for the phone's appearance setting (ADR-016 — no in-app switch), and the inverse surface that
 * the decision block and selected states use. Components read colours only through useTheme().
 */
import { createContext, type ReactNode, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { type ColorScheme, type Palette, palettes } from './tokens';

export type Theme = { scheme: ColorScheme; color: Palette };

const ThemeContext = createContext<Theme | null>(null);

/**
 * The palette inside an inverse surface: text, lines and accent swap to their decision-block values, so a Button or
 * ProgressBar placed in the block needs no special case (prototype: `.dec` redefines the same variables).
 * Warnings keep their colour: a real warning must look the same everywhere. contrast.test.ts checks these pairs too.
 */
export function inverse(p: Palette): Palette {
  return {
    ...p,
    background: p.decisionBackground,
    // No separate surface inside the block: a card or chip there sits on the block itself, and muted text on a
    // lighter surface would drop under 4.5:1 in dark mode (3.67:1 with decisionLine).
    surface: p.decisionBackground,
    raise: p.decisionLine,
    text: p.decisionText,
    textSecondary: p.decisionTextSecondary,
    muted: p.decisionMuted,
    line: p.decisionLine,
    track: p.decisionLine,
    accent: p.accentInk,
    onAccent: p.onAccentInk,
  };
}

type ProviderProps = {
  /** Overrides the phone setting; for tests and previews. */
  scheme?: ColorScheme;
  children: ReactNode;
};

export function ThemeProvider({ scheme, children }: ProviderProps) {
  const system = useColorScheme();
  // 'unspecified' (no preference reported) reads as light, the default iOS appearance.
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return <ThemeContext.Provider value={{ scheme: resolved, color: palettes[resolved] }}>{children}</ThemeContext.Provider>;
}

export function InverseSurface({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={{ ...theme, color: inverse(theme.color) }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    // A component outside the provider would otherwise silently render light colours in dark mode.
    throw new Error('useTheme() needs a <ThemeProvider> above it (src/app/_layout.tsx provides one).');
  }
  return theme;
}
