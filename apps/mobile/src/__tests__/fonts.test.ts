/** Every heading font the tokens name is registered for loading; a missing one would fall back silently. */
import { fontAssets } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';

test('the loaded fonts are exactly the fonts the tokens name', () => {
  expect(Object.keys(fontAssets).sort()).toEqual(Object.values(tokens.font).sort());
});

test('every font has an asset', () => {
  for (const asset of Object.values(fontAssets)) expect(asset).toBeDefined();
});
