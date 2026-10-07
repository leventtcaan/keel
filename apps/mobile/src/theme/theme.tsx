/**
 * Theme: the palette for the person's appearance choice (ADR-070 #3: Light, Dark or System, Light until they pick), the
 * inverse surface that the decision block and selected states use, and the focus mode that the workout and its
 * celebration always take (ADR-070 #4). Components read colours only through useTheme().
 */
import { createContext, type ReactNode, useContext } from 'react';
import { useColorScheme } from 'react-native';

import type { Appearance } from './appearance';
import { type ColorScheme, focusPalette, type Palette, palettes } from './tokens';

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
    // The page's primary button is black on light: on the black block it would vanish, so it takes the block's accent.
    cta: p.accentInk,
    onCta: p.onAccentInk,
    accentSoft: p.decisionLine,
  };
}

type ProviderProps = {
  /** The person's choice (Settings › Appearance); Light when not given. */
  appearance?: Appearance;
  /** Overrides everything; for tests, previews and dark-only screens. */
  scheme?: ColorScheme;
  children: ReactNode;
};

export function ThemeProvider({ appearance = 'light', scheme, children }: ProviderProps) {
  const system = useColorScheme();
  // System with no preference reported ('unspecified') reads as light, the default iOS appearance.
  const followed: ColorScheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const resolved: ColorScheme = scheme ?? followed;
  return <ThemeContext.Provider value={{ scheme: resolved, color: palettes[resolved] }}>{children}</ThemeContext.Provider>;
}

/** The workout and its celebration: dark whatever the person chose (ADR-070 #4: less glare in a gym, a distinct mode). */
export function FocusMode({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ scheme: 'dark', color: focusPalette }}>{children}</ThemeContext.Provider>;
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
