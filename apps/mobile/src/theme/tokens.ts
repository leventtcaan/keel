/**
 * Design tokens — C skeleton with the RUBİN palette, light and dark (ADR-016, replaces ADR-014's orange).
 * The only file in the app allowed to hold colour values, font names and type sizes; tokens.test.ts enforces it.
 * The app follows the phone's appearance setting; there is no in-app theme switch (Apple HIG).
 * Reference: prototip/keel-prototype.html (`.v-c` and `.t-dark .v-c`).
 */
const light = {
  background: '#FFFFFF',
  surface: '#F2F2F0',
  /** Buttons that sit on a surface (RIR and scale pickers). */
  raise: '#FFFFFF',
  line: '#E4E4E1',
  text: '#0E0E0E',
  textSecondary: '#2B2B2B',
  muted: '#6B6B68',
  track: '#E2E2DE',
  /** Filled controls. Text on it uses onAccent (6.18:1). */
  accent: '#B0129A',
  onAccent: '#FFFFFF',
  /** Accent used inside the decision block, and the text on it. */
  accentInk: '#F07BE0',
  onAccentInk: '#0E0E0E',
  /** Real warnings only — never the accent (ADR-016). */
  warn: '#D12F1F',
  onWarn: '#FFFFFF',
  decisionBackground: '#0E0E0E',
  decisionText: '#FFFFFF',
  decisionTextSecondary: '#D6D6D2',
  decisionMuted: '#9A9A95',
  decisionLine: '#2C2C2A',
} as const;

const dark: Record<keyof typeof light, string> = {
  background: '#0E0E0E',
  surface: '#1A1A19',
  raise: '#262624',
  line: '#2A2A28',
  text: '#F4F4F2',
  textSecondary: '#D6D6D2',
  muted: '#9A9A95',
  track: '#2C2C2A',
  accent: '#F07BE0',
  onAccent: '#0E0E0E',
  accentInk: '#B0129A',
  onAccentInk: '#FFFFFF',
  warn: '#FF6B5A',
  onWarn: '#0E0E0E',
  // The decision block inverts against the background in dark mode.
  decisionBackground: '#F4F4F2',
  decisionText: '#0E0E0E',
  decisionTextSecondary: '#2B2B2B',
  decisionMuted: '#6B6B68',
  decisionLine: '#D6D6D2',
};

export const palettes = { light, dark } as const;
export type ColorScheme = keyof typeof palettes;
export type Palette = Record<keyof typeof light, string>;

export const tokens = {
  radius: {
    card: 6,
    button: 4,
    chip: 4,
    track: 3,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 18,
    xl: 28,
  },
  /**
   * Headings and large numbers use Barlow Condensed; body text uses the system font so Dynamic Type works (ADR-016).
   * The names are the keys fonts.ts registers with expo-font.
   */
  font: {
    display: 'BarlowCondensed_800ExtraBold',
    displayBold: 'BarlowCondensed_700Bold',
    displaySemiBold: 'BarlowCondensed_600SemiBold',
  },
  type: {
    screenTitle: 34,
    decisionTitle: 30,
    heading: 24,
    number: 22,
    button: 16,
    buttonSmall: 14,
    body: 15,
    bodySmall: 13,
    label: 12,
    /** Nothing below 11 pt (ADR-016). */
    min: 11,
  },
  weight: {
    regular: '400',
    semibold: '600',
    bold: '700',
  },
  border: {
    hairline: 1,
    outline: 1.5,
  },
  size: {
    track: 6,
    /** A full-width control such as the Sign in with Apple button; above Apple's 44 pt minimum. */
    control: 50,
  },
  opacity: {
    /** Pressed and disabled controls. */
    dim: 0.5,
  },
} as const;

export type Tokens = typeof tokens;
