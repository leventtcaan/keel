/**
 * Every font the tokens name either is one of iOS's system designs, which React Native resolves by name and needs no file
 * (ADR-094 §2), or is registered for loading; a missing one would fall back silently.
 */
import { fontAssets } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';

/** The family names React Native 0.86.3 maps to UIFontDescriptor system designs (RCTFontUtils.mm › RCTGetFontDescriptorSystemDesign). */
const SYSTEM_DESIGNS = ['system-ui', 'ui-sans-serif', 'ui-serif', 'ui-rounded', 'ui-monospace'];

test('every font the tokens name is a system design or a loaded asset', () => {
  for (const family of Object.values(tokens.font)) {
    expect(SYSTEM_DESIGNS.includes(family) || family in fontAssets).toBe(true);
  }
});

test('no font is loaded that the tokens do not name', () => {
  for (const name of Object.keys(fontAssets)) expect(Object.values(tokens.font) as string[]).toContain(name);
});

test('every loaded font has an asset', () => {
  for (const asset of Object.values(fontAssets)) expect(asset).toBeDefined();
});
