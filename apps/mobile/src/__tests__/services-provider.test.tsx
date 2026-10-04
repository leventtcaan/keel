/**
 * The provider wires the services to the screens (K-305): the navigation reads useSignedIn(), and it must follow the
 * session — sign-in, sign-out. The phone parts are swapped for test ones: SQLite for node:sqlite, the keychain for a Map.
 */
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { healthParams } from '@/health/params';
import { ServicesProvider, useAppServices, useSignedIn, useUnits } from '@/services/ServicesProvider';

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
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => items.delete(key),
    },
  };
});
jest.mock('expo-apple-authentication', () => ({ isAvailableAsync: async () => true, signInAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'u' }));
jest.mock('@/api/config', () => ({ apiBaseUrl: () => 'https://api.example.test' }));
jest.mock('@/sync/autoSync', () => ({ startAutoSync: () => () => {}, deviceTriggers: {} }));
// Apple Health as a test one: available, its weigh-in read recorded (K-616).
const mockReadWeights = jest.fn(async (_from: Date, _to: Date) => [] as { id: string; at: string; kg: number }[]);
jest.mock('@/health/healthKit', () => ({
  healthKitAccess: () => ({
    available: true,
    requestRead: async () => {},
    readWeights: (from: Date, to: Date) => mockReadWeights(from, to),
    readDailyTotals: async () => [],
    readSleep: async () => [],
  }),
  healthKitWrite: () => jest.requireActual<typeof import('@/health/health')>('@/health/health').healthWriteUnavailable,
}));

let services: ReturnType<typeof useAppServices> | null = null;

function Probe() {
  const current = useAppServices();
  useEffect(() => {
    services = current;
  }, [current]);
  return <Text>{`${useSignedIn() ? 'in' : 'out'} ${useUnits()}`}</Text>;
}

test('follows the session: out, signed in, signed out', async () => {
  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );
  await act(async () => {});
  expect(screen.getByText(/^out /)).toBeOnTheScreen();

  await act(async () => {
    await services!.session.signIn({ accessToken: 'a', refreshToken: 'r', accessTokenExpiresAt: '2026-09-30T12:15:00Z' });
  });
  expect(screen.getByText(/^in /)).toBeOnTheScreen();

  global.fetch = jest.fn(async () => new Response(null, { status: 204 }));
  await act(async () => {
    await services!.signOut();
  });
  expect(screen.getByText(/^out /)).toBeOnTheScreen();
});

test('the unit system reaches the screen, and a change re-renders it', async () => {
  global.fetch = jest.fn(async () => new Response('{"code":"NOT_FOUND","message":"x"}', { status: 404, headers: { 'Content-Type': 'application/json' } }));
  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );
  await act(async () => {});
  const before = services!.units.current();
  const other = before === 'METRIC' ? 'IMPERIAL' : 'METRIC';
  expect(screen.getByText(new RegExp(` ${before}$`))).toBeOnTheScreen();
  await act(async () => {
    await services!.units.set(other);
  });
  expect(screen.getByText(new RegExp(` ${other}$`))).toBeOnTheScreen();
});

test('the import reads Apple Health only with both consents, the year before the regular read (K-616)', async () => {
  // Offline: the consents are what the phone last knew (consentState), set here by remembering them.
  global.fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  });
  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );
  await act(async () => {});
  await services!.consents.remember('HEALTH_DATA', 'GRANTED');

  expect(await services!.importHealthWeights()).toBe('consent');
  expect(await services!.syncHealth()).toMatchObject({ weighIns: 0 }); // the regular read asks the same two (K-402)
  expect(mockReadWeights).not.toHaveBeenCalled();

  await services!.consents.remember('APPLE_HEALTH', 'GRANTED');
  const before = Date.now();
  expect(await services!.importHealthWeights()).toBe(0);
  const [from, to] = mockReadWeights.mock.calls[0];
  const day = 24 * 3600 * 1000;
  expect(Math.round((before - to.getTime()) / day)).toBe(healthParams.weightReadDays);
  expect(Math.round((before - from.getTime()) / day)).toBe(healthParams.weightImportDays);
});
