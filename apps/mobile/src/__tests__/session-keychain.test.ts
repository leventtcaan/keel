/**
 * The session lives in the iOS keychain (K-305): this device only, readable after the first unlock so a refresh can run
 * while the phone is locked in a pocket at the gym.
 */
import { keychainStorage } from '@/session/keychain';
import type { StoredSession } from '@/session/session';

jest.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly' }));

function fakeSecureStore() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: jest.fn(async (key: string, _options?: object) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string, _options?: object) => {
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string, _options?: object) => {
      items.delete(key);
    }),
  };
}

const session: StoredSession = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresAt: '2026-09-30T12:15:00Z' };

test('saves, loads and clears the session', async () => {
  const store = keychainStorage(fakeSecureStore());
  expect(await store.load()).toBeNull();
  await store.save(session);
  expect(await store.load()).toEqual(session);
  await store.clear();
  expect(await store.load()).toBeNull();
});

test('written for this device only, readable after the first unlock', async () => {
  const secure = fakeSecureStore();
  await keychainStorage(secure).save(session);
  expect(secure.setItemAsync.mock.calls[0][2]).toEqual({ keychainAccessible: 'afterFirstUnlockThisDeviceOnly' });
});

test('a damaged entry is treated as signed out and removed, not a crash on every launch', async () => {
  const secure = fakeSecureStore();
  const store = keychainStorage(secure);
  await store.save(session);
  const [key] = [...secure.items.keys()];
  secure.items.set(key, '{"accessToken":');
  expect(await store.load()).toBeNull();
  expect(secure.items.size).toBe(0);
});

test('an entry missing a field is damaged too', async () => {
  const secure = fakeSecureStore();
  const store = keychainStorage(secure);
  await store.save(session);
  const [key] = [...secure.items.keys()];
  secure.items.set(key, JSON.stringify({ accessToken: 'a' }));
  expect(await store.load()).toBeNull();
});
