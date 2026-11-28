/**
 * Settings › Rate the app (K-1254, ADR-095 #3): the App Store's write-review page, the persistent link StoreKit allows in
 * settings — opened in the App Store, never Apple's prompt from a tap. No app page in the build: no row.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { t } from '@/copy';
import { RateGroup } from '@/settings/RateGroup';
import { ThemeProvider } from '@/theme/theme';

let mockStoreUrl: string | null = 'https://apps.apple.com/app/id6819852276';
const mockRequest = jest.fn(async () => {});
jest.mock('expo-store-review', () => ({ storeUrl: () => mockStoreUrl, requestReview: () => mockRequest(), isAvailableAsync: async () => true }));

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreUrl = 'https://apps.apple.com/app/id6819852276';
});

const show = () =>
  render(
    <ThemeProvider>
      <RateGroup />
    </ThemeProvider>,
  );

test('the row opens the write-review page; Apple\'s prompt is never asked for from the tap', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('settings.rate.row') })));
  expect(open).toHaveBeenCalledWith('https://apps.apple.com/app/id6819852276?action=write-review');
  expect(mockRequest).not.toHaveBeenCalled();
});

test('no App Store page in the build: no row, never a dead link', async () => {
  mockStoreUrl = null;
  await show();
  expect(screen.queryByText(t('settings.rate.row'))).toBeNull();
});
