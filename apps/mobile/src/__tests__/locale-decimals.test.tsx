/**
 * A decimal shown to a person carries the language's mark (K-1211): "82,5 kg" in Turkish, where "29.358" is a thousand and a dot
 * after a whole number would read as one. What a field holds for the code (weightInput, loadText) stays a plain number.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Stepper } from '@/components/Stepper';
import { t } from '@/copy';
import { formatDecimal } from '@/copy/format';
import { setActiveLocale } from '@/copy/locales';
import { ThemeProvider } from '@/theme/theme';
import { formatLoad, formatPlate, formatWaist, formatWeight, weightChange, weightInput } from '@/units/units';
import { formatDistance } from '@/walks/distance';

afterEach(() => setActiveLocale('en'));

test('formatDecimal: the language mark, decimals capped, a trailing zero kept only when asked', () => {
  expect(formatDecimal(82.5, 1)).toBe('82.5');
  expect(formatDecimal(82, 1)).toBe('82');
  expect(formatDecimal(82, 1, { fixed: true })).toBe('82.0');
  setActiveLocale('tr');
  expect(formatDecimal(82.5, 1)).toBe('82,5');
  expect(formatDecimal(82.04, 1, { fixed: true })).toBe('82,0');
  expect(formatDecimal(1234.5, 1)).toBe('1234,5');
  expect(formatDecimal(1234.5, 1, { grouping: true })).toBe('1.234,5');
});

test('English stays as it was', () => {
  expect(formatWeight(82.5, 'METRIC')).toBe('82.5 kg');
  expect(formatLoad(62.5, 'METRIC')).toBe('62.5 kg');
  expect(formatDistance(21.9, 'METRIC')).toBe('21.9 km');
  expect(formatPlate(1.25, 'METRIC')).toBe('1.25');
});

test('Turkish weights, loads, plates, waists and distances carry a comma', () => {
  setActiveLocale('tr');
  expect(formatWeight(82.5, 'METRIC')).toBe('82,5 kg');
  expect(weightChange(84, 82.5, 'METRIC').size).toBe('1,5 kg');
  expect(formatLoad(62.5, 'METRIC')).toBe('62,5 kg');
  expect(formatPlate(1.25, 'METRIC')).toBe('1,25');
  expect(formatWaist(84.5, 'METRIC')).toMatch(/^84,5\s?cm$/);
  expect(formatDistance(21.9, 'METRIC')).toBe('21,9 km');
});

test('a number put into Turkish copy as a number carries a comma and gains no thousands mark', () => {
  setActiveLocale('tr');
  expect(t('format.range', { low: 82.5, high: 84.1 })).toBe(t('format.range', { low: '82,5', high: '84,1' }));
  expect(t('format.range', { low: 2026, high: 2027 })).toBe(t('format.range', { low: '2026', high: '2027' }));
});

test('what a field holds for the code stays a plain number in any language', () => {
  setActiveLocale('tr');
  expect(weightInput(82.5, 'METRIC')).toBe('82.5');
  expect(Number(weightInput(82.5, 'METRIC'))).toBe(82.5);
});

test('the stepper shows its number with the language mark and reads a comma back', async () => {
  setActiveLocale('tr');
  const onChange = jest.fn();
  await render(<ThemeProvider><Stepper label="Ağırlık" value={72.5} onChange={onChange} step={2.5} unit="kg" /></ThemeProvider>);
  await fireEvent.changeText(await screen.findByDisplayValue('72,5'), '75,5');
  expect(onChange).toHaveBeenLastCalledWith(75.5);
});
