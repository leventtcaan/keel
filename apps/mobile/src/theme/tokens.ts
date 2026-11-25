/**
 * Design tokens: "Sıcak defter" (ADR-094, replaces ADR-070): an off-white paper page, petrol for the decision and the
 * action, coral for "where you are and how far you came", three soft grounds that group things, no inverted block.
 * The only file in the app allowed to hold colour values, font names and type sizes; tokens.test.ts enforces it.
 * Each colour keeps one role in every screen, sheet and pop-up (ADR-094 §1, colour-roles.test.ts). The person picks
 * Light, Dark or System in Settings, Light until they do (ADR-070 #3, kept). Reference: prototip/gorsel-yon/y5-*.jpg.
 * Contrast of every pair is held in contrast.test.ts (text 4.5:1, marks 3:1).
 */
const light = {
  /** The paper. */
  background: '#F7F5F0',
  /** A card or a neutral group: the day's sand ground (ADR-094 §1: no white card on the paper). */
  surface: '#F1ECE3',
  /** Buttons that sit on a surface (RIR and scale pickers). */
  raise: '#FCFBF8',
  line: '#E4DED2',
  /** What shows a control or its state: a field's box, an unselected chip, a pending dot. 3:1 on the page, a surface and each soft ground (WCAG 1.4.11, K-816). `line` stays the quiet divider. */
  edge: '#837C70',
  text: '#24221F',
  textSecondary: '#45413B',
  muted: '#6B665E',
  /** The empty part of a bar: light enough that the coral fill on it reaches 3:1. */
  track: '#EEE9E0',
  /** A week the 12 weeks grid draws plainly (Progress): neutral, never the warning or the progress colour (U7), 3:1 against the card. */
  weekMissed: '#837C70',
  /** Petrol: the decision and the action (the call's accent, links and text buttons, a selection, a done mark, the chart's line). */
  accent: '#1F6B73',
  onAccent: '#FFFFFF',
  /** A selected option's ground and the accent's quiet fills; the target band under a chart. */
  accentSoft: '#E3EEEE',
  /** Between accentSoft and accent: the muscle map's area partly filled (a share of the week's target, ADR-078 #4). */
  accentMid: '#8DB8BC',
  /** The primary button: petrol, as every action (ADR-094 §3). */
  cta: '#1F6B73',
  onCta: '#FFFFFF',
  /** Coral as a mark: today, the walked part of the week, a progress bar's fill, "you are here". Never a warning, a range, the primary button or body text (ADR-094 §1). */
  progress: '#CF6647',
  /** Coral as a short label (today's name): the darker shade that reads as text. */
  progressText: '#A84F38',
  /** Soft grounds (ADR-094 §1), at most three groups on a screen: time (the week path, history), the day (the day's numbers, a coach answer), a suggestion (what the coach or the engine proposes). */
  tintTime: '#E8F0EA',
  tintDay: '#F1ECE3',
  tintSuggest: '#FBEAE3',
  /** The call's accent and its text on it. The call sits on the page now (no inverted block), so these are the page's own. */
  accentInk: '#1F6B73',
  onAccentInk: '#FFFFFF',
  /** Real warnings only: a destructive action, a safety hold; always with a word or an icon (ADR-094 §1). */
  warn: '#B3261E',
  onWarn: '#FFFFFF',
  /** The decision "block" is the page itself (ADR-094 §1 drops ADR-070 #2's inverted block). */
  decisionBackground: '#F7F5F0',
  decisionText: '#24221F',
  decisionTextSecondary: '#45413B',
  decisionMuted: '#6B665E',
  decisionLine: '#E4DED2',
  /** `edge` inside the block. */
  decisionEdge: '#837C70',
  /**
   * The three macros, the same everywhere a number of them is drawn (a food row, the portion step, the day's bars; Evre 7 A): protein in
   * petrol, carbs a brown amber, fat violet; none of them coral (coral is progress, ADR-094 §1). Each is 4.5:1 on the page and on a
   * surface, and always beside its letter or name: colour alone never says which macro it is.
   */
  macroProtein: '#1F6B73',
  macroCarbs: '#8F5A12',
  macroFat: '#5B4FC4',
  /** The floating "+"'s shadow, the one control that sits over the content (K-1050). */
  shadow: '#24221F',
} as const;

const dark: Record<keyof typeof light, string> = {
  background: '#17191B',
  surface: '#24231F',
  raise: '#2E2D29',
  line: '#2E3135',
  edge: '#837D73',
  text: '#ECE8E1',
  textSecondary: '#D3CEC5',
  muted: '#A39E95',
  track: '#2E2D29',
  weekMissed: '#837D73',
  accent: '#5FB3BB',
  onAccent: '#17191B',
  accentSoft: '#16302F',
  accentMid: '#3B7F86',
  cta: '#5FB3BB',
  onCta: '#17191B',
  progress: '#F08C70',
  progressText: '#F08C70',
  tintTime: '#1E2A25',
  tintDay: '#24231F',
  tintSuggest: '#2E211C',
  accentInk: '#5FB3BB',
  onAccentInk: '#17191B',
  warn: '#FF8A80',
  onWarn: '#17191B',
  decisionBackground: '#17191B',
  decisionText: '#ECE8E1',
  decisionTextSecondary: '#D3CEC5',
  decisionMuted: '#A39E95',
  decisionLine: '#2E3135',
  decisionEdge: '#837D73',
  macroProtein: '#5FB3BB',
  macroCarbs: '#E0A85A',
  macroFat: '#A89BFF',
  shadow: '#000000',
};

export const palettes = { light, dark } as const;
export type ColorScheme = keyof typeof palettes;
export type Palette = Record<keyof typeof light, string>;

/** The workout and its celebration: always dark, whatever the person chose (ADR-070 #4), in the same roles (ADR-094 §4). */
export const focusPalette: Palette = dark;

export const tokens = {
  /** ADR-094 §3: soft groups 20, buttons a pill (half the primary button's height). */
  radius: {
    card: 20,
    button: 26,
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
   * ADR-094 §2: headings, the call and the big weight speak in the iOS system serif (New York); numbers in the system's
   * rounded design (SF Pro Rounded); body text stays the system font so Dynamic Type works. React Native 0.86.3 maps these
   * family names to UIFontDescriptor system designs (RCTFontUtils.mm › RCTGetFontDescriptorSystemDesign, checked
   * 2026-11-25), so there is nothing to load. The key names stay from ADR-070 so the screens keep their roles:
   * `display` is the serif voice, `displayBold` and `displaySemiBold` are numbers.
   */
  font: {
    display: 'ui-serif',
    displayBold: 'ui-rounded',
    displaySemiBold: 'ui-rounded',
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
    /** The workout rest's clock (K-1207): the one big thing on the screen while it counts, in the display face. */
    restClock: 96,
    button: 16,
    buttonSmall: 14,
    /** The stepper's value, in the display face (prototype `.stp .sv b`). */
    stepperValue: 36,
    /** The smallest a long stepper number is set (191.46 lb, a number past the usual length): shrinks to here, never below. */
    stepperValueMin: 22,
    /** ADR-070 #5, kept by ADR-094. */
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
  /**
   * A face is a family with its weight (ADR-094 §2): the serif speaks semibold, numbers are semibold or medium. Components
   * spread a face (`...tokens.face.display`) instead of naming a family, so no screen is left at a regular weight.
   */
  face: {
    display: { fontFamily: 'ui-serif', fontWeight: '600' },
    displayBold: { fontFamily: 'ui-rounded', fontWeight: '600' },
    displaySemiBold: { fontFamily: 'ui-rounded', fontWeight: '500' },
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
    /** The screen's one primary button: a 52 pt pill (ADR-094 §3). */
    primaryButton: 52,
    /** A grouped list's row (ADR-070 Ek 2 #2, prototype `.row`): taller than size.touch, so a row is never a squeeze. */
    row: 52,
    /** The stepper's - and + (prototype `.stp .sb2`). */
    stepperButton: 48,
    /** How many characters of the stepper's number fit at full size; more, and the number is set smaller (see `fitValue`). */
    stepperFitChars: 5,
    /** A display-face character is this many times its font size wide, at most (the box the number is given). */
    stepperCharEm: 0.62,
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
    /** The first-use guide's dim over the screen (K-1065): the part it points at stays clear. */
    guideDim: 0.62,
  },
  /** The app's few movements of its own, each skipped under Reduce Motion (K-807). */
  motion: {
    /** The call's reveal on its screen (ADR-077 #3, prototype `.block.reveal`): rising into place, in milliseconds. */
    revealMs: 450,
    /** How far below its place the call starts. */
    revealRise: 24,
    /** The undo banner coming in (UndoBanner), in milliseconds. */
    bannerMs: 200,
    /** Progress follows its data (K-1065): a bar filling, a number counting up, the muscle map taking its colour, in milliseconds. */
    fillMs: 600,
    countMs: 700,
    mapMs: 500,
    /** The first-use guide moving from one step to the next, in milliseconds. */
    guideMs: 260,
    /** The guide waits for a part to stop moving (a screen sliding away over it) before it points at it: the gap between two reads, and how many at most. */
    guideSettleMs: 80,
    guideSettleTries: 12,
  },
} as const;

export type Tokens = typeof tokens;
