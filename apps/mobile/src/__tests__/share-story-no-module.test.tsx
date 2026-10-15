/**
 * The app starts in a build without react-native-share (an older development build, K-976): the library is asked for
 * lazily, so loading the share code, the services and the share screen never touches it. The guard is behavioural, not a
 * reading of the source: here the package is one whose loading throws, as the native module does when it is missing, and
 * the whole chain is loaded. If any file under src/share (or anything else the services pull in) loads the package at the
 * top, in whatever import form, this fails. `virtual` so the guard holds wherever the package is installed or not.
 */
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

type Services = ReturnType<typeof import('@/services/ServicesProvider').useAppServices>;

const mockLoaded = jest.fn();
jest.mock(
  'react-native-share',
  () => {
    mockLoaded();
    throw new Error("TurboModuleRegistry.getEnforcing(...): 'RNShare' could not be found");
  },
  { virtual: true },
);
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
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: async () => true,
  signInAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'u',
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytes: (n: number) => new Uint8Array(n),
  digestStringAsync: async () => 'hash',
}));
jest.mock('@/api/config', () => ({ apiBaseUrl: () => 'https://api.example.test' }));
jest.mock('@/sync/autoSync', () => ({ startAutoSync: () => () => {}, deviceTriggers: {} }));

const before = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
afterEach(() => {
  if (before === undefined) delete process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  else process.env.EXPO_PUBLIC_FACEBOOK_APP_ID = before;
});

test('loading the share code, the services and the share screen does not load the native package', () => {
  // Loaded here, not at the top of the file, so a package loaded at import fails this test by name, not the whole suite.
  expect(() => jest.requireActual('@/share/deviceStory')).not.toThrow();
  expect(() => jest.requireActual('@/services/ServicesProvider')).not.toThrow();
  expect(() => jest.requireActual('@/app/share')).not.toThrow();

  expect(mockLoaded).not.toHaveBeenCalled();
});

test('with an App ID but without the module: Stories are unavailable and the problem is said by name (the share sheet takes over)', async () => {
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID = '1234567890';
  global.fetch = jest.fn(async () => new Response('{"code":"NOT_FOUND","message":"x"}', { status: 404, headers: { 'Content-Type': 'application/json' } }));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const { ServicesProvider, useAppServices } = jest.requireActual<typeof import('@/services/ServicesProvider')>('@/services/ServicesProvider');
  let services: Services | null = null;
  function Probe() {
    const current = useAppServices();
    useEffect(() => {
      services = current;
    }, [current]);
    return <Text>probe</Text>;
  }

  await render(
    <ServicesProvider>
      <Probe />
    </ServicesProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('probe')).toBeOnTheScreen();

  const result = await services!.shareStory({ sticker: 'iVBORw0KGgo=', background: { kind: 'color', hex: '#000000' } });

  expect(result).toBe('unavailable');
  expect(mockLoaded).toHaveBeenCalled(); // it was asked for, lazily, once the service was made with an App ID, and failed there
  expect(warn).toHaveBeenCalledWith('sync problem:', 'ShareModuleMissing');
  warn.mockRestore();
});
