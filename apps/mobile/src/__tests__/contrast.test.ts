/**
 * Text on filled controls, and every text colour on its surface, must reach WCAG AA (4.5:1) in both themes (ADR-016)
 * — including the inverse palette that components receive inside the decision block. The previous orange failed at
 * 3.29:1.
 */
import { inverse } from '@/theme/theme';
import { type Palette, palettes } from '@/theme/tokens';

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
    expect(contrast('#B0129A', '#FFFFFF')).toBeCloseTo(6.18, 2); // ADR-016's stated ratio
  });

  test.each(Object.entries(palettes))('reads every %s value as six-digit hex (the formula needs it)', (_, p) => {
    for (const value of Object.values(p)) expect(value).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

const surfaces: [string, Palette][] = [
  ['light', palettes.light],
  ['dark', palettes.dark],
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
