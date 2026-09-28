/**
 * Design tokens — visual direction C, bold and energetic (ADR-014).
 * The only file in the app allowed to hold colour values; tokens.test.ts enforces it.
 * Reference: prototip/keel-prototype.html (.v-c).
 */
export const tokens = {
  color: {
    background: '#FFFFFF',
    surface: '#F2F2F0',
    line: '#E4E4E1',
    text: '#0E0E0E',
    textSecondary: '#2B2B2B',
    muted: '#6B6B68',
    accent: '#FF4F12',
    onAccent: '#FFFFFF',
    track: '#E2E2DE',
    decisionBackground: '#0E0E0E',
    decisionText: '#FFFFFF',
  },
  radius: {
    card: 6,
    button: 4,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 18,
    xl: 28,
  },
  type: {
    // Barlow / Barlow Condensed are loaded in K-301; until then the system font is used.
    displaySize: 34,
    displayWeight: '800',
    bodySize: 15,
    labelSize: 11,
    labelLetterSpacing: 1.5,
  },
} as const;

export type Tokens = typeof tokens;
