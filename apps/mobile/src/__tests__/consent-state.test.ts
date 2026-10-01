/**
 * Whether a consent is given, as the phone knows it (K-402, ADR-030 #25): asked of the server, and kept on the phone so a
 * health entry made offline can still check it. Unknown is "not given": nothing health is kept on a guess.
 */
import { createConsentState } from '@/consent/consentState';

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}
const answer = (status: string) => ({
  data: [
    { kind: 'HEALTH_DATA', status },
    { kind: 'APPLE_HEALTH', status: 'NEVER_ASKED' },
  ],
  response: new Response(null, { status: 200 }),
});

test("the server's answer, and kept for later", async () => {
  const kv = memoryKv();
  const state = createConsentState({ api: { GET: async () => answer('GRANTED') } as never, kv });
  expect(await state.granted('HEALTH_DATA')).toBe(true);
  expect(await state.granted('APPLE_HEALTH')).toBe(false);
  const offline = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv });
  expect(await offline.granted('HEALTH_DATA')).toBe(true);
});

test('offline and never known: not given', async () => {
  const state = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv: memoryKv() });
  expect(await state.granted('HEALTH_DATA')).toBe(false);
});

test('a grant or a withdrawal made on the phone is remembered at once; forgetting leaves nothing known', async () => {
  const kv = memoryKv();
  const state = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv });
  await state.remember('HEALTH_DATA', 'GRANTED');
  expect(await state.granted('HEALTH_DATA')).toBe(true);
  await state.remember('HEALTH_DATA', 'WITHDRAWN');
  expect(await state.granted('HEALTH_DATA')).toBe(false);
  await state.remember('HEALTH_DATA', 'GRANTED');
  await state.forget();
  expect(await state.granted('HEALTH_DATA')).toBe(false);
});

test('a server that refuses (not offline) is not taken for a yes either, even with a yes kept from before', async () => {
  const kv = memoryKv();
  kv.items.set('consent.HEALTH_DATA', 'GRANTED');
  const state = createConsentState({
    api: { GET: async () => ({ error: { code: 'INTERNAL' }, response: new Response(null, { status: 500 }) }) } as never,
    kv,
  });
  expect(await state.granted('HEALTH_DATA')).toBe(false);
});
