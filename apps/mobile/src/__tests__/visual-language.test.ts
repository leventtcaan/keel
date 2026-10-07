/**
 * The visual language ADR-070 decided, held where it is easy to lose in a later edit: turquoise instead of RUBİN, a white
 * page, the decision block inverting the page, a black primary button on light and a turquoise one on dark, the type and
 * the shapes.
 */
import { fontAssets } from '@/theme/fonts';
import { focusPalette, palettes, tokens } from '@/theme/tokens';

test('RUBİN is gone from both palettes (ADR-070 replaces ADR-016)', () => {
  const values = [...Object.values(palettes.light), ...Object.values(palettes.dark)].map((v) => v.toUpperCase());
  for (const rubin of ['#B0129A', '#F07BE0']) expect(values).not.toContain(rubin);
});

test('the turquoise accent: a fill on light, the bright one on dark and on the black block (ADR-070 #1)', () => {
  // One shade under ADR-070's #007C8C: the accent is text too, and #007C8C is 4.42:1 on the surface (ADR-070 Ek 1).
  expect(palettes.light.accent).toBe('#007684');
  expect(palettes.light.onAccent).toBe('#FFFFFF');
  expect(palettes.dark.accent).toBe('#35D7CF');
  expect(palettes.dark.onAccent).toBe('#061212');
  expect(palettes.light.accentInk).toBe('#2EE6D6');
  expect(palettes.light.accentSoft).toBe('#DDF3F4');
  expect(palettes.dark.accentSoft).toBe('#113030');
});

test('a white page on light, ink near black (ADR-070 #2)', () => {
  expect(palettes.light.background).toBe('#FFFFFF');
  expect(palettes.light.surface).toBe('#F1F3F3');
  expect(palettes.light.line).toBe('#DCE0E0');
  expect(palettes.light.text).toBe('#0B0C0C');
});

test('the decision block inverts the page (ADR-070 #2)', () => {
  expect(palettes.light.decisionBackground).toBe(palettes.light.text);
  expect(palettes.dark.decisionBackground).toBe(palettes.dark.text);
});

test('the primary button is black on light and turquoise on dark (ADR-070 #2)', () => {
  expect(palettes.light.cta).toBe(palettes.light.text);
  expect(palettes.dark.cta).toBe(palettes.dark.accent);
});

test('warnings keep their own colours (ADR-070 #1)', () => {
  expect(palettes.light.warn).toBe('#D12F1F');
  expect(palettes.dark.warn).toBe('#FF6B5A');
});

test('focus mode is the dark palette (ADR-070 #4)', () => {
  expect(focusPalette).toEqual(palettes.dark);
});

test('headings are Barlow Condensed 900, loaded (ADR-070 #5)', () => {
  expect(tokens.font.display).toBe('BarlowCondensed_900Black');
  expect(fontAssets[tokens.font.display]).toBeDefined();
});

test('body text is 17 pt and nothing goes under 11 (ADR-070 #5)', () => {
  expect(tokens.type.body).toBe(17);
  const screenSizes = Object.entries(tokens.type).filter(([name]) => !name.startsWith('share'));
  for (const [, size] of screenSizes) expect(size).toBeGreaterThanOrEqual(tokens.type.min);
});

test('shapes: cards 16-18, buttons 12, options 16; touch targets 44, the primary button 54 (ADR-070 #6)', () => {
  expect(tokens.radius.card).toBeGreaterThanOrEqual(16);
  expect(tokens.radius.card).toBeLessThanOrEqual(18);
  expect(tokens.radius.button).toBe(12);
  expect(tokens.radius.option).toBe(16);
  expect(tokens.size.touch).toBeGreaterThanOrEqual(44);
  expect(tokens.size.primaryButton).toBe(54);
});
