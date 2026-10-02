/**
 * State mode on the phone (K-518, ADR-038): what the user declared, as the server answered it, kept on the phone so the
 * reminders stay quiet while it is in force (ADR-036 #7) — offline too. Health data (sickness, pain): forgotten with the
 * account and with the health data consent.
 */
import { createStateService } from '@/state/stateService';

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}
const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
const refused = (status: number) => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });
const TODAY = new Date(2026, 9, 7, 9, 0); // Wednesday 7 Oct 2026, on the phone's calendar

function service(api: Record<string, jest.Mock>, kv = memoryKv()) {
  const changed = jest.fn();
  return { kv, changed, state: createStateService({ api: api as never, kv, now: () => TODAY, onChange: changed }) };
}

test('a declared state is sent, kept on the phone, and quiets the reminders', async () => {
  const PUT = jest.fn(async () => ok({ kind: 'SICK', since: '2026-10-07' }));
  const { state, changed } = service({ PUT });

  await state.declare('SICK');

  expect(PUT).toHaveBeenCalledWith('/v1/state', { body: { kind: 'SICK' } });
  expect(await state.inForce()).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1);
});

test('a last day is sent when given; past it, the state is not in force on the phone either', async () => {
  const PUT = jest.fn(async () => ok({ kind: 'TRAVELING', since: '2026-10-01', until: '2026-10-06' }));
  const { state } = service({ PUT });

  await state.declare('TRAVELING', '2026-10-06');

  expect(PUT).toHaveBeenCalledWith('/v1/state', { body: { kind: 'TRAVELING', until: '2026-10-06' } });
  expect(await state.inForce()).toBe(false);
});

test('its last day is still a day of it', async () => {
  const { state } = service({});
  await state.keep({ state: 'ready', value: { kind: 'BUSY', since: '2026-10-05', until: '2026-10-07' } });
  expect(await state.inForce()).toBe(true);
});

test('"back" ends it on the server and on the phone', async () => {
  const PUT = jest.fn(async () => ok({ kind: 'BUSY', since: '2026-10-07' }));
  const DELETE = jest.fn(async () => ok(undefined, 204));
  const { state, changed } = service({ PUT, DELETE });
  await state.declare('BUSY');

  await state.back();

  expect(DELETE).toHaveBeenCalledWith('/v1/state');
  expect(await state.inForce()).toBe(false);
  expect(changed).toHaveBeenCalledTimes(2);
});

test('what the server says on a read is kept: a state, or none (404); a read that failed changes nothing', async () => {
  const { state, changed } = service({});
  await state.keep({ state: 'ready', value: { kind: 'PAIN', since: '2026-10-05' } });
  expect(await state.inForce()).toBe(true);
  await state.keep({ state: 'failed', problem: 'NoConnection' });
  expect(await state.inForce()).toBe(true);
  await state.keep({ state: 'none' });
  expect(await state.inForce()).toBe(false);
  // Told of each change, and only of a change.
  await state.keep({ state: 'none' });
  expect(changed).toHaveBeenCalledTimes(2);
});

test('a refusal or no answer throws by name, and nothing changes on the phone', async () => {
  const offline = service({ PUT: jest.fn(async () => Promise.reject(new TypeError('Network request failed'))) });
  await expect(offline.state.declare('SICK')).rejects.toMatchObject({ name: 'NoConnection' });
  expect(await offline.state.inForce()).toBe(false);
  const refusing = service({ DELETE: jest.fn(async () => refused(403)) });
  await refusing.state.keep({ state: 'ready', value: { kind: 'SICK', since: '2026-10-07' } });
  await expect(refusing.state.back()).rejects.toMatchObject({ name: 'StateRefused' });
  expect(await refusing.state.inForce()).toBe(true);
});

test('forgotten: nothing is known, nothing kept', async () => {
  const { state, kv } = service({});
  await state.keep({ state: 'ready', value: { kind: 'SICK', since: '2026-10-07' } });
  await state.forget();
  expect(await state.inForce()).toBe(false);
  expect(kv.items.size).toBe(0);
});
