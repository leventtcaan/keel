/**
 * Sign out and Delete account ask in a system alert (ADR-087 #1, K-5). The inline step sat at the end of the list, off the
 * screen: the tap showed nothing. The alert is where the user is looking; the destructive button runs the old flow, the
 * cancel one does nothing. Settings and the paywall's Account sheet are the same section.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import { AccountSheet } from '@/subscription/AccountSheet';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

let mockSubscription: Subscription = { appUserId: ID, active: false };
const mockServices = {
  api: { GET: jest.fn(async (_path: string) => ({ data: mockSubscription, response: new Response(null, { status: 200 }) })) },
  purchases: { available: true },
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async (): Promise<{ takenOn: string; pose: string; uri: string }[]> => []) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const PHOTO = { takenOn: '2026-10-07', pose: 'front', uri: 'file:///docs/a.jpg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockServices.pendingCount.mockResolvedValue(0);
  mockSubscription = { appUserId: ID, active: false };
});

const asked = () => {
  expect(alert).toHaveBeenCalledTimes(1);
  const [title, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
  return { title, message, buttons };
};
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

describe.each([
  ['Settings account section', () => <AccountSection />],
  ['the paywall account sheet', () => <AccountSheet visible onClose={() => {}} />],
])('%s', (_, view) => {
  const show = async () => {
    await render(<ThemeProvider scheme="light">{view()}</ThemeProvider>);
  };

  describe('Sign out', () => {
    test('nothing waiting and no photos on the phone: signs out at once, nothing to ask', async () => {
      await show();
      await press(t('settings.signOut.title'));
      expect(alert).not.toHaveBeenCalled();
      expect(mockServices.signOut).toHaveBeenCalledTimes(1);
    });

    test('progress photos only on the phone: a system alert says signing out removes them; nothing runs yet', async () => {
      mockServices.photos.photos.mockResolvedValueOnce([PHOTO]);
      await show();
      await press(t('settings.signOut.title'));
      const { title, message, buttons } = asked();
      expect(title).toBe(t('settings.signOut.confirmTitle'));
      expect(message).toBe(t('settings.signOut.photos'));
      expect(message).toMatch(/removes them from it/);
      expect(buttons.map((b) => [b.text, b.style])).toEqual([
        [t('settings.signOut.keep'), 'cancel'],
        [t('settings.signOut.confirm'), 'destructive'],
      ]);
      expect(mockServices.signOut).not.toHaveBeenCalled();
      // Nothing inline at the end of the list any more.
      expect(screen.queryByText(t('settings.signOut.photos'))).toBeNull();
      expect(screen.queryByRole('button', { name: t('settings.signOut.confirm') })).toBeNull();
    });

    test('entries waiting, and photos: both said, one paragraph each', async () => {
      mockServices.pendingCount.mockResolvedValueOnce(3);
      mockServices.photos.photos.mockResolvedValueOnce([PHOTO]);
      await show();
      await press(t('settings.signOut.title'));
      expect(asked().message).toBe(`${t('settings.signOut.pending', { count: 3 })}\n\n${t('settings.signOut.photos')}`);
    });

    test('the destructive button signs out; the cancel button does nothing', async () => {
      mockServices.pendingCount.mockResolvedValue(2);
      await show();
      await press(t('settings.signOut.title'));
      const { buttons } = asked();
      const keep = buttons.find((b) => b.style === 'cancel')!;
      const confirm = buttons.find((b) => b.style === 'destructive')!;
      await act(async () => keep.onPress?.());
      expect(mockServices.signOut).not.toHaveBeenCalled();
      await act(async () => confirm.onPress?.());
      expect(mockServices.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete account', () => {
    test('a system alert, not an inline step: the question, the short message, Delete everything / Keep my account', async () => {
      await show();
      await press(t('settings.delete.title'));
      const { title, message, buttons } = asked();
      expect(title).toBe(t('settings.delete.confirmTitle'));
      expect(message).toBe(t('settings.delete.confirmBody'));
      expect(buttons.map((b) => [b.text, b.style])).toEqual([
        [t('settings.delete.keep'), 'cancel'],
        [t('settings.delete.confirm'), 'destructive'],
      ]);
      expect(mockServices.deleteAccount).not.toHaveBeenCalled();
      expect(screen.queryByText(t('settings.delete.confirmTitle'))).toBeNull();
      expect(screen.queryByRole('button', { name: t('settings.delete.confirm') })).toBeNull();
    });

    test('a running subscription: the message also says Apple keeps billing until it is cancelled in Settings', async () => {
      mockSubscription = { appUserId: ID, active: true, status: 'ACTIVE', accessUntil: '2026-11-11T12:00:00Z' };
      await show();
      await press(t('settings.delete.title'));
      expect(asked().message).toBe(`${t('settings.delete.confirmBody')}\n\n${t('settings.delete.subscription')}`);
      expect(t('settings.delete.subscription')).toMatch(/Settings › Subscription/);
    });

    test('the destructive button starts the deletion; the cancel button does not', async () => {
      await show();
      await press(t('settings.delete.title'));
      const { buttons } = asked();
      await act(async () => buttons.find((b) => b.style === 'cancel')!.onPress?.());
      expect(mockServices.deleteAccount).not.toHaveBeenCalled();
      await act(async () => buttons.find((b) => b.style === 'destructive')!.onPress?.());
      expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
    });
  });
});
