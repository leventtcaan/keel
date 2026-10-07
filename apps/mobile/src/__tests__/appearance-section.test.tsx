/**
 * Settings › Appearance (ADR-070 #3): Light, Dark and System, the current one selected; a tap keeps the choice.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { AppearanceSection } from '@/settings/AppearanceSection';
import type { Appearance } from '@/theme/appearance';
import { ThemeProvider } from '@/theme/theme';

let mockChoice: Appearance = 'light';
const mockListeners = new Set<() => void>();
const mockServices = {
  appearance: {
    current: () => mockChoice,
    subscribe: (listener: () => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
    set: jest.fn(async (next: Appearance) => {
      mockChoice = next;
      mockListeners.forEach((listener) => listener());
    }),
  },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useAppearance: () => mockServices.appearance.current(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockChoice = 'light';
  mockListeners.clear();
});

async function show() {
  await render(
    <ThemeProvider>
      <AppearanceSection />
    </ThemeProvider>,
  );
}

test('three choices, Light selected until the person picks', async () => {
  await show();
  expect(screen.getByText(t('settings.appearance.title'))).toBeTruthy();
  expect(screen.getByRole('button', { name: t('settings.appearance.light') }).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByRole('button', { name: t('settings.appearance.dark') }).props.accessibilityState).toMatchObject({ selected: false });
  expect(screen.getByRole('button', { name: t('settings.appearance.system') }).props.accessibilityState).toMatchObject({ selected: false });
});

test('a tap keeps the choice', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('settings.appearance.system') }));
  expect(mockServices.appearance.set).toHaveBeenCalledWith('system');
});
