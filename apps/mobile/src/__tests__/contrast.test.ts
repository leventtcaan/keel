/**
 * Text on filled controls, and every text colour on its surface, must reach WCAG AA (4.5:1) in both themes and in the
 * workout's focus mode (ADR-070) — including the inverse palette that components receive inside the decision block.
 */
import { inverse } from '@/theme/theme';
import { focusPalette, type Palette, palettes } from '@/theme/tokens';

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('the contrast formula', () => {
  test('matches known WCAG values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrast('#007C8C', '#FFFFFF')).toBeCloseTo(4.93, 2); // ADR-070's stated ratio for its turquoise fill
  });

  test.each(Object.entries(palettes))('reads every %s value as six-digit hex (the formula needs it)', (_, p) => {
    for (const value of Object.values(p)) expect(value).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

const surfaces: [string, Palette][] = [
  ['light', palettes.light],
  ['dark', palettes.dark],
  ['focus mode (the workout, always dark)', focusPalette],
  ['inverse light (inside the decision block)', inverse(palettes.light)],
  ['inverse dark (inside the decision block)', inverse(palettes.dark)],
];

describe.each(surfaces)('%s palette', (_, p) => {
  test.each(['text', 'textSecondary', 'muted'] as const)('%s reaches 4.5:1 on background and surface', (ink) => {
    expect(contrast(p[ink], p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p[ink], p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  // Raised controls (RIR and scale pickers) label in the text colour; muted text does not sit on them.
  test('text on a raised control reaches 4.5:1', () => {
    expect(contrast(p.text, p.raise)).toBeGreaterThanOrEqual(4.5);
  });

  test('text on the accent fill reaches 4.5:1', () => {
    expect(contrast(p.accent, p.onAccent)).toBeGreaterThanOrEqual(4.5);
  });

  test('text on the warning fill reaches 4.5:1', () => {
    expect(contrast(p.warn, p.onWarn)).toBeGreaterThanOrEqual(4.5);
  });

  test('text on the primary button reaches 4.5:1, and the button stands out from the page', () => {
    expect(contrast(p.cta, p.onCta)).toBeGreaterThanOrEqual(4.5);
    // A non-text control needs 3:1 against what is next to it (WCAG 1.4.11).
    expect(contrast(p.cta, p.background)).toBeGreaterThanOrEqual(3);
  });

  test('text on the soft accent ground reaches 4.5:1', () => {
    expect(contrast(p.text, p.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  test('a selected chip (text fill, background label) reaches 4.5:1', () => {
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('warning is a separate colour from the accent', () => {
    expect(p.warn).not.toBe(p.accent);
  });
});

describe.each(Object.entries(palettes))('%s decision block', (_, p) => {
  test('its text, secondary and muted text reach 4.5:1', () => {
    expect(contrast(p.decisionText, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.decisionTextSecondary, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.decisionMuted, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test('the block accent as text on the block reaches 4.5:1', () => {
    expect(contrast(p.accentInk, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
  });
});

// K-807 (Accessibility Nutrition Labels › Sufficient Contrast): the accent and the warning are text too — "in use" on a
// gym, a failed save — on the page, in both themes.
describe.each(Object.entries(palettes))('%s accent and warning as text', (_, p) => {
  test('the accent reaches 4.5:1 on the soft accent ground (a selected option)', () => {
    expect(contrast(p.accent, p.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(['accent', 'warn'] as const)('%s reaches 4.5:1 on background and surface', (ink) => {
    expect(contrast(p[ink], p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p[ink], p.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

test('nothing inside the decision block is drawn in the warning colour: there it would fall under 4.5:1', () => {
  // inverse() keeps the warning's colour (a warning looks the same everywhere), so it may not appear on the block. A file
  // that puts something in the block builds it in variables too (the raw-text guard), so the whole file is held to it.
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === '__tests__' ? [] : walk(path.join(dir, e.name))) : /\.tsx$/.test(e.name) ? [path.join(dir, e.name)] : [],
    );
  const block = walk(path.resolve(__dirname, '..')).filter((file) => /<(DecisionBlock|InverseSurface)\b|function DecisionBlock\b/.test(fs.readFileSync(file, 'utf8')));
  expect(block.length).toBeGreaterThan(2);
  const warned = block.filter((file) => /color\.warn|['"]warn['"]/.test(fs.readFileSync(file, 'utf8')));
  expect(warned.map((file) => path.relative(path.resolve(__dirname, '..'), file))).toEqual([]);
  for (const [, p] of Object.entries(palettes)) expect(contrast(p.warn, inverse(p).background)).toBeLessThan(4.5);
});
