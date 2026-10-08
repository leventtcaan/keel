/**
 * Whether a consent is given, as the phone knows it (K-402, ADR-030 #25): asked of the server, and kept on the phone so a
 * health entry made offline can still check it. Unknown is "not given": nothing health is kept on a guess.
 */
import { consentVersion } from '@/consent/consents';
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

test('a grant to a text the phone no longer shows is not given: the user is asked again, to the text shown now (K-429)', async () => {
  const kv = memoryKv();
  const older = {
    data: [
      { kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: '1-draft' },
      { kind: 'APPLE_HEALTH', status: 'GRANTED', textVersion: consentVersion('APPLE_HEALTH') },
    ],
    response: new Response(null, { status: 200 }),
  };
  const state = createConsentState({ api: { GET: async () => older } as never, kv });
  expect(await state.granted('HEALTH_DATA')).toBe(false);
  // Each kind against its own text: Apple Health's is current.
  expect(await state.granted('APPLE_HEALTH')).toBe(true);
  // Offline afterwards: what was kept is "not given" too, not the old yes.
  const offline = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv });
  expect(await offline.granted('HEALTH_DATA')).toBe(false);
  expect(await offline.granted('APPLE_HEALTH')).toBe(true);
});

test('a grant to the text shown now is given, online and offline', async () => {
  const kv = memoryKv();
  const current = {
    data: [{ kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: consentVersion('HEALTH_DATA') }],
    response: new Response(null, { status: 200 }),
  };
  expect(await createConsentState({ api: { GET: async () => current } as never, kv }).granted('HEALTH_DATA')).toBe(true);
  const offline = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv });
  expect(await offline.granted('HEALTH_DATA')).toBe(true);
});

test('a yes the phone kept before the text was revised is not taken offline (K-429): it was a yes to the old text', async () => {
  const kv = memoryKv();
  kv.items.set('consent.HEALTH_DATA', 'GRANTED'); // as the build before K-429 kept it
  const offline = createConsentState({ api: { GET: async () => Promise.reject(new TypeError('offline')) } as never, kv });
  expect(await offline.granted('HEALTH_DATA')).toBe(false);
  kv.items.set('consent.HEALTH_DATA', 'GRANTED@1-draft'); // kept with its text, by a build that showed the older one
  expect(await offline.granted('HEALTH_DATA')).toBe(false);
  // What this build keeps names the text it shows, so the next revision reads it as a yes to an older text.
  await offline.remember('HEALTH_DATA', 'GRANTED');
  expect(kv.items.get('consent.HEALTH_DATA')).toBe(`GRANTED@${consentVersion('HEALTH_DATA')}`);
});

describe('held: whether a grant is held, for taking it back (K-986)', () => {
  const offline = { GET: async () => Promise.reject(new TypeError('offline')) } as never;
  const failing = { GET: async () => ({ error: { code: 'INTERNAL' }, response: new Response(null, { status: 500 }) }) } as never;
  const answering = (status: string, textVersion = consentVersion('HEALTH_DATA')) =>
    ({ GET: async () => ({ data: [{ kind: 'HEALTH_DATA', status, textVersion }], response: new Response(null, { status: 200 }) }) }) as never;

  test("the server's answer: a grant, to the text shown now or an older one, is held; anything else is not", async () => {
    expect(await createConsentState({ api: answering('GRANTED'), kv: memoryKv() }).held('HEALTH_DATA')).toBe(true);
    expect(await createConsentState({ api: answering('GRANTED', '1-draft'), kv: memoryKv() }).held('HEALTH_DATA')).toBe(true);
    expect(await createConsentState({ api: answering('WITHDRAWN'), kv: memoryKv() }).held('HEALTH_DATA')).toBe(false);
    expect(await createConsentState({ api: answering('NEVER_ASKED'), kv: memoryKv() }).held('HEALTH_DATA')).toBe(false);
  });

  test('a server that answered with an error cannot say: unknown, even with a no kept from before', async () => {
    const kv = memoryKv();
    kv.items.set('consent.HEALTH_DATA', `WITHDRAWN@${consentVersion('HEALTH_DATA')}`);
    expect(await createConsentState({ api: failing, kv }).held('HEALTH_DATA')).toBe('unknown');
  });

  test('offline: what the phone kept, a grant to any text held; nothing kept is not held', async () => {
    const kv = memoryKv();
    const state = createConsentState({ api: offline, kv });
    expect(await state.held('HEALTH_DATA')).toBe(false);
    await state.remember('HEALTH_DATA', 'GRANTED');
    expect(await state.held('HEALTH_DATA')).toBe(true);
    kv.items.set('consent.HEALTH_DATA', 'GRANTED@1-draft');
    expect(await state.held('HEALTH_DATA')).toBe(true);
    await state.remember('HEALTH_DATA', 'WITHDRAWN');
    expect(await state.held('HEALTH_DATA')).toBe(false);
  });

  test('a phone that cannot read what it kept cannot say either: unknown', async () => {
    const kv = { ...memoryKv(), getItemAsync: async () => Promise.reject(new Error('locked')) };
    expect(await createConsentState({ api: offline, kv }).held('HEALTH_DATA')).toBe('unknown');
  });

  test('granted is unchanged by it: a server error is still "not given" there', async () => {
    expect(await createConsentState({ api: failing, kv: memoryKv() }).granted('HEALTH_DATA')).toBe(false);
  });
});
