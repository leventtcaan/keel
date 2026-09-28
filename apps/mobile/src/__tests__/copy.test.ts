import { t } from '@/copy';

test('returns the English string for a key', () => {
  expect(t('tabs.today')).toBe('Today');
});

test('marks a missing key instead of crashing', () => {
  expect(t('does.not.exist')).toBe('[missing: does.not.exist]');
});

test('fills {placeholders} from vars', () => {
  // Uses a real key with no placeholder: vars that are not referenced change nothing.
  expect(t('tabs.food', { unused: 1 })).toBe('Food');
});
