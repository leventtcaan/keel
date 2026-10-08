/**
 * Design tokens: turquoise on a white page, an inverted decision block, a dark focus mode (ADR-070, replaces ADR-016's
 * RUBİN). The only file in the app allowed to hold colour values, font names and type sizes; tokens.test.ts enforces it.
 * The person picks Light, Dark or System in Settings, Light until they do (ADR-070 #3).
 * Reference: prototip/yeni-yuz.html (`.phone` and `.phone[data-mode="dark"]`).
 *
 * The light accent is #007684, one shade under ADR-070's #007C8C: the accent is text too ("in use", links), and #007C8C
 * reaches only 4.42:1 on the surface; #007684 reaches 4.80:1 there and 5.35:1 under white (ADR-070 Ek 1).
 */
const light = {
  background: '#FFFFFF',
  surface: '#F1F3F3',
  /** Buttons that sit on a surface (RIR and scale pickers). */
  raise: '#FFFFFF',
  line: '#DCE0E0',
  text: '#0B0C0C',
  textSecondary: '#2B2F2F',
  muted: '#586061',
  track: '#E4E8E8',
  /** Filled controls, selection and the decision's number. Text on it uses onAccent (5.35:1). */
  accent: '#007684',
  onAccent: '#FFFFFF',
  /** A selected option's ground and the accent's quiet fills. */
  accentSoft: '#DDF3F4',
  /** The primary button: black on light, turquoise on dark (ADR-070 #2). */
  cta: '#0B0C0C',
  onCta: '#FFFFFF',
  /** Accent used inside the decision block, and the text on it. */
  accentInk: '#2EE6D6',
  onAccentInk: '#0B0C0C',
  /** Real warnings only, never the accent (ADR-070 #1). */
  warn: '#D12F1F',
  onWarn: '#FFFFFF',
  decisionBackground: '#0B0C0C',
  decisionText: '#FFFFFF',
  decisionTextSecondary: '#D3D9D9',
  decisionMuted: '#A9B1B1',
  decisionLine: '#2A2F2F',
} as const;

const dark: Record<keyof typeof light, string> = {
  background: '#0E1010',
  surface: '#191C1C',
  raise: '#262A2A',
  line: '#2A2F2F',
  text: '#F1F4F4',
  textSecondary: '#D3D9D9',
  muted: '#9AA4A4',
  track: '#262A2A',
  accent: '#35D7CF',
  onAccent: '#061212',
  accentSoft: '#113030',
  cta: '#35D7CF',
  onCta: '#061212',
  // On the light block of dark mode: the same text-safe turquoise as the light accent (4.84:1 on the block).
  accentInk: '#007684',
  onAccentInk: '#FFFFFF',
  warn: '#FF6B5A',
  onWarn: '#0E1010',
  // The decision block inverts against the background in dark mode.
  decisionBackground: '#F1F4F4',
  // The page's own background: a selected chip on the page is drawn in exactly the block's colours (Chip).
  decisionText: '#0E1010',
  decisionTextSecondary: '#2B2F2F',
  decisionMuted: '#4C5555',
  decisionLine: '#C9D0D0',
};

export const palettes = { light, dark } as const;
export type ColorScheme = keyof typeof palettes;
export type Palette = Record<keyof typeof light, string>;

/** The workout and its celebration: always dark, whatever the person chose (ADR-070 #4). */
export const focusPalette: Palette = dark;

export const tokens = {
  /** ADR-070 #6: filled cards, no outlined ones. */
  radius: {
    card: 16,
    button: 12,
    /** A choice the person picks: onboarding answers, option cards. */
    option: 16,
    chip: 8,
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
   * Headings, the decision's label and large numbers use Barlow Condensed 900 in capitals; body text uses the system font
   * so Dynamic Type works (ADR-070 #5). The names are the keys fonts.ts registers with expo-font.
   */
  font: {
    display: 'BarlowCondensed_900Black',
    displayBold: 'BarlowCondensed_700Bold',
    displaySemiBold: 'BarlowCondensed_600SemiBold',
  },
  type: {
    screenTitle: 34,
    decisionTitle: 30,
    heading: 24,
    number: 22,
    /** The number on an onboarding day box (prototype `.numtile b`). */
    tile: 56,
    button: 16,
    buttonSmall: 14,
    /** ADR-070 #5. */
    body: 17,
    bodySmall: 15,
    label: 13,
    /** Nothing below 11 pt (ADR-016, kept by ADR-070). */
    min: 11,
    /**
     * The share card's text, in its image units (1080 wide, K-612) — an image, scaled to the screen to preview and kept
     * at full size in the PNG: large enough to read in a feed, smaller ones would be under 11 pt once scaled down.
     */
    shareHeading: 64,
    shareLine: 52,
    shareFooter: 34,
  },
  weight: {
    regular: '400',
    semibold: '600',
    bold: '700',
  },
  border: {
    hairline: 1,
    outline: 1.5,
    /** The chosen recommended answer's accent ring (prototype `.opt.hero[aria-pressed]`). */
    ring: 3,
  },
  size: {
    track: 6,
    /** A full-width control such as the Sign in with Apple button; above Apple's 44 pt minimum. */
    control: 50,
    /** Apple's minimum touch target (ADR-070 #6). */
    touch: 44,
    /** The screen's one primary button (ADR-070 #6). */
    primaryButton: 54,
  },
  opacity: {
    /** Pressed and disabled controls. */
    dim: 0.5,
  },
} as const;

export type Tokens = typeof tokens;
