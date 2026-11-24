/** Settings › Language (K-1211): System, English, Türkçe; the current one selected; a tap keeps the choice. */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { createLanguage } from '@/copy/language';
import { LanguageSection } from '@/settings/LanguageSection';
import { ThemeProvider } from '@/theme/theme';
import type { KeyValue } from '@/units/preference';

const mockStore: { language?: Awaited<ReturnType<typeof createLanguage>> } = {};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => ({ language: mockStore.language, report: jest.fn() }),
  useLanguage: () => {
    const react = jest.requireActual<typeof import('react')>('react');
    return react.useSyncExternalStore(mockStore.language!.subscribe, mockStore.language!.current);
  },
}));

const data = new Map<string, string>();
const kv: KeyValue = {
  getItemAsync: async (key) => data.get(key) ?? null,
  setItemAsync: async (key, value) => void data.set(key, value),
  removeItemAsync: async (key) => data.delete(key),
};

beforeEach(async () => {
  data.clear();
  mockStore.language = await createLanguage({ kv, deviceLocale: 'en-US' });
});

const show = () =>
  render(
    <ThemeProvider>
      <LanguageSection />
    </ThemeProvider>,
  );

test('three choices, System selected until the person picks', async () => {
  await show();
  expect(screen.getByText(t('settings.language.title'))).toBeTruthy();
  expect(screen.getByRole('button', { name: 'English' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Türkçe' })).toBeTruthy();
  expect(screen.getByRole('button', { name: t('settings.language.system') }).props.accessibilityState).toMatchObject({ selected: true });
});

test('a tap keeps the choice on the phone and moves the selection', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Türkçe' }));
  expect(data.get('language')).toBe('tr');
  expect(screen.getByRole('button', { name: 'Türkçe' }).props.accessibilityState).toMatchObject({ selected: true });
});
