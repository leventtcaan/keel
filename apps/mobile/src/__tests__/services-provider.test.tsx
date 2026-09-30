/**
 * The provider wires the services to the screens (K-305): the navigation reads useSignedIn(), and it must follow the
 * session — sign-in, sign-out. The phone parts are swapped for test ones: SQLite for node:sqlite, the keychain for a Map.
 */
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ServicesProvider, useAppServices, useSignedIn } from '@/services/ServicesProvider';

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'x',
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    deleteItemAsync: async (key: string) => void items.delete(key),
  };
});
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => jest.requireActual<typeof import('./support/nodeSqlite')>('./support/nodeSqlite').nodeSqlite(),
}));
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: async () => true, signInAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'u' }));
jest.mock('@/api/config', () => ({ apiBaseUrl: () => 'https://api.example.test' }));
jest.mock('@/sync/autoSync', () => ({ startAutoSync: () => () => {}, deviceTriggers: {} }));

let services: ReturnType<typeof useAppServices> | null = null;

function Probe() {
  const current = useAppServices();
  useEffect(() => {
    services = current;
  }, [current]);
  return <Text>{useSignedIn() ? 'in' : 'out'}</Text>;
}

test('follows the session: out, signed in, signed out', async () => {
  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('out')).toBeOnTheScreen();

  await act(async () => {
    await services!.session.signIn({ accessToken: 'a', refreshToken: 'r', accessTokenExpiresAt: '2026-09-30T12:15:00Z' });
  });
  expect(screen.getByText('in')).toBeOnTheScreen();

  global.fetch = jest.fn(async () => new Response(null, { status: 204 }));
  await act(async () => {
    await services!.signOut();
  });
  expect(screen.getByText('out')).toBeOnTheScreen();
});
