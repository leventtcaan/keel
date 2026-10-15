/**
 * Apple Health asked when it is first used (K-980, ADR-018 Ek 1, ADR-072 #8, prototype `#health-jit`): at the first weigh-in
 * or at the end of the first workout, once. "Not now" is free and is also the once; the grant is Apple's sheet first, then
 * the consent, so a sheet that fails leaves no consent behind (connectAppleHealth). Where Apple Health cannot be asked
 * (Expo Go), or the health data consent is not given, or Apple Health is on already, there is nothing to ask.
 */
import { connectHealthJit, createHealthAsk, healthJitDue } from '@/health/justInTime';

function kvStore() {
  const kept = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => kept.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void kept.set(key, value),
    removeItemAsync: async (key: string) => void kept.delete(key),
  };
}

function setup(over: { available?: boolean; granted?: Partial<Record<'HEALTH_DATA' | 'APPLE_HEALTH', boolean>> } = {}) {
  const granted = { HEALTH_DATA: true, APPLE_HEALTH: false, ...over.granted };
  const healthAsk = createHealthAsk({ kv: kvStore() });
  const health = { available: over.available ?? true, requestRead: jest.fn(async () => {}) };
  const consents = {
    granted: jest.fn(async (kind: 'HEALTH_DATA' | 'APPLE_HEALTH') => granted[kind]),
    remember: jest.fn(async (_kind: string, _status: string) => {}),
  };
  const api = { PUT: jest.fn(async (_path: string, _init?: unknown) => ({ data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) })) };
  return { healthAsk, health, consents, api };
}

test('due the first time: Apple Health can be asked, the health data consent is given, Apple Health is not on', async () => {
  const { healthAsk, health, consents } = setup();
  expect(await healthJitDue({ health, consents, healthAsk })).toBe(true);
});

test.each([
  ['Apple Health cannot be asked on this build', { available: false }],
  ['the health data consent is not given (what it reads is health data)', { granted: { HEALTH_DATA: false } }],
  ['Apple Health is on already (given in Settings)', { granted: { APPLE_HEALTH: true } }],
])('not due when %s', async (_, over) => {
  const { healthAsk, health, consents } = setup(over);
  expect(await healthJitDue({ health, consents, healthAsk })).toBe(false);
});

test('once: after "Not now" it is never due again, in this session or the next', async () => {
  const { healthAsk, health, consents } = setup();
  await healthAsk.markAsked();
  expect(await healthJitDue({ health, consents, healthAsk })).toBe(false);
});

test('connecting: Apple\'s sheet, then the consent to the text shown, then remembered; it counts as asked', async () => {
  const { healthAsk, health, consents, api } = setup();
  const order: string[] = [];
  health.requestRead.mockImplementation(async () => void order.push('sheet'));
  api.PUT.mockImplementation(async () => {
    order.push('consent');
    return { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) };
  });

  expect(await connectHealthJit({ api: api as never, health, consents, healthAsk })).toBe('connected');

  expect(order).toEqual(['sheet', 'consent']);
  expect(api.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', expect.objectContaining({ params: { path: { kind: 'APPLE_HEALTH' } } }));
  expect(consents.remember).toHaveBeenCalledWith('APPLE_HEALTH', 'GRANTED');
  expect(await healthAsk.asked()).toBe(true);
});

test('a sheet that fails leaves no consent and is not the once: it can be asked again', async () => {
  const { healthAsk, health, consents, api } = setup();
  health.requestRead.mockRejectedValueOnce(new Error('no'));

  expect(await connectHealthJit({ api: api as never, health, consents, healthAsk })).toBe('sheetFailed');

  expect(api.PUT).not.toHaveBeenCalled();
  expect(await healthAsk.asked()).toBe(false);
});

test('a consent the server did not take is not the once either', async () => {
  const { healthAsk, health, consents, api } = setup();
  api.PUT.mockResolvedValueOnce({ error: { code: 'INTERNAL' }, response: new Response(null, { status: 500 }) } as never);

  expect(await connectHealthJit({ api: api as never, health, consents, healthAsk })).toBe('failed');

  expect(consents.remember).not.toHaveBeenCalled();
  expect(await healthAsk.asked()).toBe(false);
});

test('signing out forgets that it was asked: the next account is asked afresh', async () => {
  const { healthAsk } = setup();
  await healthAsk.markAsked();
  await healthAsk.forget();
  expect(await healthAsk.asked()).toBe(false);
});
