/**
 * Text on filled controls, and every text colour on its surface, must reach WCAG AA (4.5:1) in both themes (ADR-016).
 * The previous orange failed at 3.29:1.
 */
import { palettes } from '@/theme/tokens';

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

describe.each(Object.entries(palettes))('%s palette', (_, p) => {
  test('text on the accent fill reaches 4.5:1', () => {
    expect(contrast(p.accent, p.onAccent)).toBeGreaterThanOrEqual(4.5);
  });

  test('body text on the background reaches 4.5:1', () => {
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('text inside the decision block reaches 4.5:1', () => {
    expect(contrast(p.decisionText, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test('text on the warning fill reaches 4.5:1', () => {
    expect(contrast(p.warn, p.onWarn)).toBeGreaterThanOrEqual(4.5);
  });

  test('text on the block accent (a button inside the decision block) reaches 4.5:1', () => {
    expect(contrast(p.accentInk, p.onAccentInk)).toBeGreaterThanOrEqual(4.5);
  });

  test('the block accent as text on the decision block reaches 4.5:1', () => {
    expect(contrast(p.accentInk, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test('secondary and muted text reach 4.5:1 on the background and inside the block', () => {
    expect(contrast(p.textSecondary, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.decisionTextSecondary, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.decisionMuted, p.decisionBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test('warning is a separate colour from the accent', () => {
    expect(p.warn).not.toBe(p.accent);
  });
});
