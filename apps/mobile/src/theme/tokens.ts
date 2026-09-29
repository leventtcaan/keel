/**
 * Design tokens — C skeleton with the RUBİN palette, light and dark (ADR-016, replaces ADR-014's orange).
 * The only file in the app allowed to hold colour values; tokens.test.ts enforces it.
 * The app follows the phone's appearance setting; there is no in-app theme switch (Apple HIG).
 * Reference: prototip/keel-prototype.html.
 */
const light = {
  background: '#FFFFFF',
  surface: '#F2F2F0',
  line: '#E4E4E1',
  text: '#0E0E0E',
  textSecondary: '#2B2B2B',
  muted: '#6B6B68',
  track: '#E2E2DE',
  /** Filled controls. Text on it uses onAccent (6.18:1). */
  accent: '#B0129A',
  onAccent: '#FFFFFF',
  /** Accent used inside the decision block. */
  accentInk: '#F07BE0',
  /** Real warnings only — never the accent (ADR-016). */
  warn: '#D12F1F',
  decisionBackground: '#0E0E0E',
  decisionText: '#FFFFFF',
} as const;

const dark: Record<keyof typeof light, string> = {
  background: '#0E0E0E',
  surface: '#1A1A19',
  line: '#2A2A28',
  text: '#F4F4F2',
  textSecondary: '#D6D6D2',
  muted: '#9A9A95',
  track: '#2C2C2A',
  accent: '#F07BE0',
  onAccent: '#0E0E0E',
  accentInk: '#B0129A',
  warn: '#FF6B5A',
  // The decision block inverts against the background in dark mode.
  decisionBackground: '#F4F4F2',
  decisionText: '#0E0E0E',
};

export const palettes = { light, dark } as const;
export type ColorScheme = keyof typeof palettes;
export type Palette = Record<keyof typeof light, string>;

export const tokens = {
  /** Light palette; screens that support both themes read palettes[scheme] (K-301). */
  color: light as Palette,
  radius: {
    card: 6,
    button: 4,
    chip: 4,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 18,
    xl: 28,
  },
  type: {
    // Headings use Barlow Condensed (loaded in K-301); body text uses the system font for Dynamic Type.
    displaySize: 34,
    displayWeight: '800',
    bodySize: 15,
    labelSize: 12,
    minSize: 11,
  },
} as const;

export type Tokens = typeof tokens;
