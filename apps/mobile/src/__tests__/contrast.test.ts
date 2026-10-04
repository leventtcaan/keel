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

// K-807 (Accessibility Nutrition Labels › Sufficient Contrast): the accent and the warning are text too — "in use" on a
// gym, a failed save — on the page, in both themes.
describe.each(Object.entries(palettes))('%s accent and warning as text', (_, p) => {
  test.each(['accent', 'warn'] as const)('%s reaches 4.5:1 on background and surface', (ink) => {
    expect(contrast(p[ink], p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p[ink], p.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

test('nothing inside the decision block is drawn in the warning colour: there it would fall under 4.5:1', () => {
  // inverse() keeps the warning's colour (a warning looks the same everywhere), so it may not appear on the block — in the
  // block's own code nor in anything a screen puts inside it.
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const ts = jest.requireActual<typeof import('typescript')>('typescript');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === '__tests__' ? [] : walk(path.join(dir, e.name))) : /\.tsx$/.test(e.name) ? [path.join(dir, e.name)] : [],
    );
  const inside: string[] = [];
  for (const file of walk(path.resolve(__dirname, '..'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: import('typescript').Node) => {
      if (ts.isJsxElement(node) && ['InverseSurface', 'DecisionBlock'].includes(node.openingElement.tagName.getText(source))) {
        inside.push(node.children.map((child) => child.getText(source)).join(''));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(inside.length).toBeGreaterThan(0);
  expect(inside.filter((jsx) => /color\.warn|variant=["']warn["']/.test(jsx))).toEqual([]);
  // Its own code: the block draws its parts itself.
  expect(fs.readFileSync(path.resolve(__dirname, '../components/DecisionBlock.tsx'), 'utf8')).not.toMatch(/color\.warn|variant=["']warn["']/);
  for (const [, p] of Object.entries(palettes)) expect(contrast(p.warn, inverse(p).background)).toBeLessThan(4.5);
});
