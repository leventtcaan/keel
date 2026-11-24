/**
 * Settings › Training › Rest (K-1214): Recommended (the band) or the user's own value for compound and isolation moves.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { RestSection, restLine } from '@/settings/RestSection';
import { type RestChoice, defaultChoice } from '@/train/restBand';
import { ThemeProvider } from '@/theme/theme';

let mockChoice: RestChoice = defaultChoice();
const mockListeners = new Set<() => void>();
const mockServices = {
  restPreference: {
    current: () => mockChoice,
    subscribe: (listener: () => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
    set: jest.fn(async (next: RestChoice) => {
      mockChoice = next;
      mockListeners.forEach((listener) => listener());
    }),
  },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useRestChoice: () =>
    jest.requireActual<typeof import('react')>('react').useSyncExternalStore(mockServices.restPreference.subscribe, mockServices.restPreference.current),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockChoice = defaultChoice();
  mockListeners.clear();
});

const show = () =>
  render(
    <ThemeProvider>
      <RestSection />
    </ThemeProvider>,
  );

test('Recommended until the person picks: the band is said, no steppers', async () => {
  await show();
  expect(screen.getByRole('button', { name: t('settings.rest.recommended') }).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByText(t('settings.rest.recommendedNote', { band: '2-3 min' }))).toBeTruthy();
  expect(screen.queryByTestId('rest-COMPOUND')).toBeNull();
  expect(restLine(mockChoice)).toBe('2-3 min');
});

test('Your own: a stepper for each kind, a tap moves it by the rest step and keeps it', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('settings.rest.custom') }));
  expect(mockServices.restPreference.set).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'CUSTOM' }));
  expect(screen.getByTestId('rest-COMPOUND')).toBeTruthy();
  expect(screen.getByTestId('rest-ISOLATION')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('settings.rest.moreLabel', { what: t('settings.rest.isolation'), seconds: 15 }) }));
  expect(mockChoice.custom).toEqual({ COMPOUND: 120, ISOLATION: 135 });
  await fireEvent.press(screen.getByRole('button', { name: t('settings.rest.lessLabel', { what: t('settings.rest.compound'), seconds: 15 }) }));
  expect(mockChoice.custom).toEqual({ COMPOUND: 105, ISOLATION: 135 });
  expect(restLine(mockChoice)).toBe(t('settings.rest.custom'));
});
