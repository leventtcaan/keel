/**
 * The visual language ADR-094 decided ("Sıcak defter", replaces ADR-070), held where it is easy to lose in a later edit:
 * an off-white paper page, petrol for the decision and the action, coral for "where you are and how far you came", soft
 * tinted grounds instead of white or black cards, a serif voice for headings and rounded numbers, no capitals.
 */
import { fontAssets } from '@/theme/fonts';
import { focusPalette, palettes, tokens } from '@/theme/tokens';

test('turquoise and the black block of ADR-070 are gone from both palettes', () => {
  const values = [...Object.values(palettes.light), ...Object.values(palettes.dark)].map((v) => v.toUpperCase());
  for (const old of ['#007684', '#007C8C', '#2EE6D6', '#35D7CF', '#0B0C0C', '#B0129A']) expect(values).not.toContain(old);
});

test('an off-white paper page with warm ink (ADR-094 §1)', () => {
  expect(palettes.light.background).toBe('#F7F5F0');
  expect(palettes.light.text).toBe('#24221F');
  expect(palettes.dark.background).toBe('#17191B');
  expect(palettes.dark.text).toBe('#ECE8E1');
});

test('petrol is the decision and the action: the accent, the primary button and a selection (ADR-094 §1)', () => {
  expect(palettes.light.accent).toBe('#1F6B73');
  expect(palettes.dark.accent).toBe('#5FB3BB');
  for (const p of [palettes.light, palettes.dark]) {
    expect(p.cta).toBe(p.accent);
    expect(p.onCta).toBe(p.onAccent);
  }
});

test('coral is progress only, a colour of its own, never the accent or the warning (ADR-094 §1)', () => {
  expect(palettes.light.progress).toBe('#CF6647');
  expect(palettes.light.progressText).toBe('#A84F38');
  expect(palettes.dark.progress).toBe('#F08C70');
  for (const p of [palettes.light, palettes.dark]) {
    expect(p.progress).not.toBe(p.accent);
    expect(p.progress).not.toBe(p.warn);
    expect(p.progressText).not.toBe(p.warn);
  }
});

test('three soft grounds group things: time, the day, a suggestion (ADR-094 §1)', () => {
  expect(palettes.light.tintTime).toBe('#E8F0EA');
  expect(palettes.light.tintDay).toBe('#F1ECE3');
  expect(palettes.light.tintSuggest).toBe('#FBEAE3');
  // The neutral surface of a card is the day's sand ground: no white card on the paper.
  expect(palettes.light.surface).toBe(palettes.light.tintDay);
  expect(palettes.dark.surface).toBe(palettes.dark.tintDay);
});

test('no inverted block: the decision sits on the page (ADR-094 §1)', () => {
  for (const p of [palettes.light, palettes.dark]) {
    expect(p.decisionBackground).toBe(p.background);
    expect(p.decisionText).toBe(p.text);
    expect(p.accentInk).toBe(p.accent);
  }
});

test('warnings keep their own colours, apart from the accent and from progress (ADR-094 §1)', () => {
  expect(palettes.light.warn).toBe('#B3261E');
  expect(palettes.dark.warn).toBe('#FF8A80');
});

test('focus mode is the dark palette with the same roles (ADR-094 §4)', () => {
  expect(focusPalette).toEqual(palettes.dark);
});

test('headings speak in the system serif, numbers in the rounded system design; nothing to load (ADR-094 §2)', () => {
  // React Native 0.86.3 maps these family names to UIFontDescriptor system designs (RCTFontUtils.mm, checked 2026-11-25).
  expect(tokens.font.display).toBe('ui-serif');
  expect(tokens.font.displayBold).toBe('ui-rounded');
  expect(tokens.font.displaySemiBold).toBe('ui-rounded');
  expect(Object.keys(fontAssets)).toEqual([]);
  expect(tokens.face.display).toEqual({ fontFamily: 'ui-serif', fontWeight: tokens.weight.semibold });
  expect(tokens.face.displayBold.fontFamily).toBe('ui-rounded');
});

test('body text is 17 pt and nothing goes under 11 (kept from ADR-070 #5)', () => {
  expect(tokens.type.body).toBe(17);
  const screenSizes = Object.entries(tokens.type).filter(([name]) => !name.startsWith('share'));
  for (const [, size] of screenSizes) expect(size).toBeGreaterThanOrEqual(tokens.type.min);
});

test('shapes: soft groups 20, the primary button a 52 pt pill, touch targets 44 (ADR-094 §3)', () => {
  expect(tokens.radius.card).toBe(20);
  expect(tokens.size.primaryButton).toBe(52);
  expect(tokens.radius.button).toBe(tokens.size.primaryButton / 2);
  expect(tokens.size.touch).toBeGreaterThanOrEqual(44);
});
