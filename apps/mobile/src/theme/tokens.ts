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
  /** What shows a control or its state: a field's box, an unselected chip, a pending dot. 3:1 on the page and a surface (WCAG 1.4.11, K-816). `line` stays the quiet divider. */
  edge: '#7E8888',
  text: '#0B0C0C',
  textSecondary: '#2B2F2F',
  muted: '#586061',
  track: '#E4E8E8',
  /** A week the 12 weeks grid draws plainly (Progress): neutral, not the warning colour (U7), 3:1 against the card (WCAG 1.4.11). */
  weekMissed: '#7E8888',
  /** Filled controls, selection and the decision's number. Text on it uses onAccent (5.35:1). */
  accent: '#007684',
  onAccent: '#FFFFFF',
  /** A selected option's ground and the accent's quiet fills. */
  accentSoft: '#DDF3F4',
  /** Between accentSoft and accent: the muscle map's area partly filled (a share of the week's target, ADR-078 #4). */
  accentMid: '#7CC4CA',
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
  /** `edge` inside the block. */
  decisionEdge: '#7E8888',
  /** The floating "+"'s shadow, the one control that sits over the content (K-1050). */
  shadow: '#0B0C0C',
} as const;

const dark: Record<keyof typeof light, string> = {
  background: '#0E1010',
  surface: '#191C1C',
  raise: '#262A2A',
  line: '#2A2F2F',
  edge: '#727D7D',
  text: '#F1F4F4',
  textSecondary: '#D3D9D9',
  muted: '#9AA4A4',
  track: '#262A2A',
  weekMissed: '#6B7575',
  accent: '#35D7CF',
  onAccent: '#061212',
  accentSoft: '#113030',
  accentMid: '#1F7E7A',
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
  decisionEdge: '#727D7D',
  shadow: '#000000',
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
    /** The paywall's headline and the example call's number (prototype paywall-v2 `h1`, `.hnums b`), and the number it replaces (`.hnums s`). */
    display: 44,
    displaySmall: 24,
    /** The number on an onboarding day box (prototype `.numtile b`). */
    tile: 56,
    /** The photo timer's countdown over the viewfinder (prototype `.cnt`), in the display face. */
    countdown: 140,
    button: 16,
    buttonSmall: 14,
    /** The stepper's value, in the display face (prototype `.stp .sv b`). */
    stepperValue: 36,
    /** ADR-070 #5. */
    body: 17,
    bodySmall: 15,
    label: 13,
    /** Nothing below 11 pt (ADR-016, kept by ADR-070). */
    min: 11,
    /**
     * The share stickers' text, in their image units (1080 wide, K-975) — an image, scaled to the screen to preview and
     * kept at full size in the PNG: large enough to read in a feed; a long text steps down from these (layout.ts).
     */
    shareKicker: 40,
    shareTitle: 150,
    shareValue: 104,
    shareLabel: 36,
    shareLine: 48,
    shareMark: 72,
  },
  weight: {
    regular: '400',
    semibold: '600',
    bold: '700',
    /** The heaviest system weight (UIFontWeightBlack); FitText sizes a label's box with a hidden copy in it (K-910). */
    black: '900',
  },
  border: {
    hairline: 1,
    outline: 1.5,
    /** The chosen recommended answer's accent ring (prototype `.opt.hero[aria-pressed]`). */
    ring: 3,
    /** The shutter's ring (prototype `.sh`). */
    shutter: 4,
    /** The photo guide's outline (prototype `.sil`). */
    silhouette: 2.2,
  },
  size: {
    track: 6,
    /** A full-width control such as the Sign in with Apple button; above Apple's 44 pt minimum. */
    control: 50,
    /** Apple's minimum touch target (ADR-070 #6). */
    touch: 44,
    /** The screen's one primary button (ADR-070 #6). */
    primaryButton: 54,
    /** A grouped list's row (ADR-070 Ek 2 #2, prototype `.row`): taller than size.touch, so a row is never a squeeze. */
    row: 52,
    /** The stepper's - and + (prototype `.stp .sb2`). */
    stepperButton: 48,
    /** The undo banner's least height (prototype `.bnr`). */
    banner: 52,
    /** The progress photo intro's drawing of the two outlines (K-1055). */
    introArt: 200,
    /** The iOS tab bar above the home indicator, which the banner at the root of the app sits over (prototype `.bnr.up`). */
    tabBar: 49,
    /** Progress (ADR-078, prototype `.tgt`): a target box's least height; a week of the 12 weeks grid; a weigh-in dot; a legend swatch. */
    targetBox: 104,
    weekCell: 24,
    dot: 14,
    swatch: 10,
    /** An onboarding answer's or point's icon tile (prototype `.opt .oi`, `.bullets .bi`). */
    optionIcon: 40,
    /** The paywall (ADR-072 Ek 3, prototype paywall-v2): the app icon in its header, a value's icon tile, a timeline's dot, a plan's radio. */
    brandMark: 30,
    valueTile: 36,
    timelineDot: 16,
    planRadio: 24,
    /** The progress photo's camera (K-1055, prototype yeniden-yapim §10): the shutter. */
    shutter: 78,
    /** Sets per muscle: the muscle's name column and the count column beside its bar. */
    barName: 92,
    barCount: 44,
  },
  /** SF Symbols (ADR-070 Ek 2 #3): one weight, two sizes. */
  icon: {
    small: 20,
    regular: 24,
    weight: 'medium',
  },
  /** What floats over the content (the "+", K-1050): a soft drop under it. */
  float: { offsetY: 4, blur: 12, opacity: 0.24 },
  opacity: {
    /** Pressed and disabled controls. */
    dim: 0.5,
    /** The dark panel behind a sticker's words, so they read on any photo (K-975). */
    scrim: 0.45,
    /** The photo guide's outline while the phone is not straight, over the live picture (K-1055): present, not shouting. */
    silhouette: 0.55,
  },
  /** The app's few movements of its own, each skipped under Reduce Motion (K-807). */
  motion: {
    /** The call's reveal on its screen (ADR-077 #3, prototype `.block.reveal`): rising into place, in milliseconds. */
    revealMs: 450,
    /** How far below its place the call starts. */
    revealRise: 24,
    /** The undo banner coming in (UndoBanner), in milliseconds. */
    bannerMs: 200,
  },
} as const;

export type Tokens = typeof tokens;
