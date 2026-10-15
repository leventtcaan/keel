/**
 * The weigh screen's plus and minus (K-980, ADR-018 Ek 1 "≤4 taps"): one step is the tenth a scale shows, in the user's
 * own unit (`weight_display_decimals`), so a number typed or filled in from the last weigh-in moves the way a scale does.
 */
import { stepWeightText } from '@/weighIn/step';

test.each([
  ['80.4', 1, 'METRIC', '80.5'],
  ['80.4', -1, 'METRIC', '80.3'],
  ['80.3', 1, 'METRIC', '80.4'], // 80.3 + 0.1 is 80.39999… in binary; it reads 80.4
  ['80,4', 1, 'METRIC', '80.5'], // the iOS number pad types a comma
  ['179.7', 1, 'IMPERIAL', '179.8'], // a tenth of a pound, not of a kilogram
  ['179.7', -1, 'IMPERIAL', '179.6'],
  ['80', 1, 'METRIC', '80.1'],
] as const)('%s %i (%s) reads %s', (text, direction, system, expected) => {
  expect(stepWeightText(text, direction, system)).toBe(expected);
});

test.each([
  ['', 1],
  ['abc', -1],
  ['0.1', -1], // a weight is above zero
])('"%s" does not step %i: it stays as it is', (text, direction) => {
  expect(stepWeightText(text, direction as 1 | -1, 'METRIC')).toBe(text);
});

test('what the server cannot keep is not stepped to', () => {
  expect(stepWeightText('500.0', 1, 'METRIC')).toBe('500.0');
  expect(stepWeightText('499.9', 1, 'METRIC')).toBe('500.0');
});
