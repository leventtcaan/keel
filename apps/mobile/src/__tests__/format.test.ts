/** One formatNumber / formatDate / formatTime, keyed by the active language (K-1211). */
import { setActiveLocale } from '@/copy/locales';
import { formatDate, formatNumber, formatTime } from '@/copy/format';

afterEach(() => setActiveLocale('en'));

test('English: 1,234.5', () => {
  expect(formatNumber(1234.5)).toBe('1,234.5');
  expect(formatNumber(1234.56, { maximumFractionDigits: 0 })).toBe('1,235');
});

test('Turkish: 1.234,5', () => {
  setActiveLocale('tr');
  expect(formatNumber(1234.5)).toBe('1.234,5');
  expect(formatNumber(1234567)).toBe('1.234.567');
});

test('a date follows the language', () => {
  const day = new Date('2026-03-04T00:00:00Z');
  const options = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
  expect(formatDate(day, options)).toBe('Mar 4');
  setActiveLocale('tr');
  expect(formatDate(day, options)).toBe('4 Mar');
});

test('a time follows the language', () => {
  const at = new Date('2026-03-04T15:05:00Z');
  expect(formatTime(at, { timeZone: 'UTC' })).toMatch(/^3:05\sPM$/);
  setActiveLocale('tr');
  expect(formatTime(at, { timeZone: 'UTC' })).toBe('15:05');
});
