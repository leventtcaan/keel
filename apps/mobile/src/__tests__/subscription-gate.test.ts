/**
 * The subscription gate after onboarding (K-706, ADR-058 #1): an account that never subscribed reaches the tabs only through
 * the paywall; an account with any subscription kept — an ended one too — does not meet it (the deterministic mode, K-703).
 * The server decides; its last answer is kept on the phone, so airplane mode does not open the gate and a subscriber is not
 * locked out offline. Without the store in the build, or without both legal links, the gate is never closed.
 */
import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { createSubscriptionGate } from '@/subscription/gate';
import type { SubscriptionStore } from '@/subscription/store';
import { storeUnavailable } from '@/subscription/store';

import { memoryKv } from './support/profileServer';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NEVER: Subscription = { active: false, appUserId: ID };
const ENDED: Subscription = { active: false, appUserId: ID, status: 'EXPIRED', accessUntil: '2026-09-01T00:00:00Z' };
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2026-10-11T12:00:00Z' };
const LINKS = [
  { key: 'subscription.terms', url: 'https://example.test/terms' },
  { key: 'subscription.privacy', url: 'https://example.test/privacy' },
];
const STORE: SubscriptionStore = { ...storeUnavailable, available: true };

function server(...answers: (Subscription | 'offline' | 500)[]) {
  let at = 0;
  const fetch = jest.fn(async () => {
    const answer = answers[Math.min(at++, answers.length - 1)];
    if (answer === 'offline') throw new TypeError('Network request failed');
    if (answer === 500) return new Response(JSON.stringify({ code: 'INTERNAL', message: 'x' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return { api: createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 't', fetch }), fetch };
}

const reported: string[] = [];
const report = (problem: { name: string }) => void reported.push(problem.name);
beforeEach(() => (reported.length = 0));

async function gate(api: ReturnType<typeof server>['api'], kv = memoryKv(), purchases = STORE, links = LINKS) {
  return createSubscriptionGate({ kv, api, purchases, links, report });
}

test('never subscribed: the gate is closed — and the answer is kept on the phone', async () => {
  const kv = memoryKv();
  const g = await gate(server(NEVER).api, kv);
  expect(g.current()).toBe('unknown');
  await g.refresh();
  expect(g.current()).toBe('required');
  expect((await gate(server('offline').api, kv)).current()).toBe('required'); // the next start, before any answer
});

test.each([
  ['an ended subscription (the deterministic mode)', ENDED],
  ['a trial', TRIAL],
])('%s: the gate is open', async (_, answer) => {
  const g = await gate(server(answer).api);
  await g.refresh();
  expect(g.current()).toBe('open');
});

test('bought: the gate opens on the next answer, and the open answer is kept', async () => {
  const kv = memoryKv();
  const g = await gate(server(NEVER, TRIAL).api, kv);
  await g.refresh();
  await g.refresh();
  expect(g.current()).toBe('open');
  expect((await gate(server('offline').api, kv)).current()).toBe('open');
});

test('airplane mode does not open a closed gate; nor a server error', async () => {
  const kv = memoryKv();
  await (await gate(server(NEVER).api, kv)).refresh();
  const offline = await gate(server('offline', 500).api, kv);
  await offline.refresh();
  expect(offline.current()).toBe('required');
  await offline.refresh();
  expect(offline.current()).toBe('required');
});

test('a subscriber offline is not locked out: the kept open answer stays', async () => {
  const kv = memoryKv();
  await (await gate(server(TRIAL).api, kv)).refresh();
  const offline = await gate(server('offline').api, kv);
  await offline.refresh();
  expect(offline.current()).toBe('open');
});

test('the first start offline, nothing kept: open — never a lock with no answer to lift it; the failure is reported by name', async () => {
  const g = await gate(server('offline').api);
  await g.refresh();
  expect(g.current()).toBe('open');
  expect(reported).toEqual(['NoConnection']);
});

test.each([
  ['the store is not in the build (Expo Go, no key)', storeUnavailable, LINKS],
  ['a legal link is missing', STORE, LINKS.slice(1)],
])('%s: the gate is open and the server is not asked', async (_, purchases, links) => {
  const { api, fetch } = server(NEVER);
  const g = await gate(api, memoryKv(), purchases, links);
  expect(g.current()).toBe('open');
  await g.refresh();
  expect(g.current()).toBe('open');
  expect(fetch).not.toHaveBeenCalled();
});

test('a change is told to whoever listens (the root layout)', async () => {
  const g = await gate(server(NEVER, TRIAL).api);
  const heard: string[] = [];
  g.subscribe(() => heard.push(g.current()));
  await g.refresh();
  await g.refresh();
  expect(heard).toEqual(['required', 'open']);
});

test('sign-out forgets the answer: the next account is asked afresh', async () => {
  const kv = memoryKv();
  const g = await gate(server(NEVER).api, kv);
  await g.refresh();
  await g.forget();
  expect(g.current()).toBe('unknown');
  expect((await gate(server('offline').api, kv)).current()).toBe('unknown');
});

test("an answer that arrives after a sign-out is not the next account's", async () => {
  let answer: (response: Response) => void = () => {};
  const fetch = jest.fn(() => new Promise<Response>((resolve) => (answer = resolve)));
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 't', fetch });
  const g = await gate(api);
  const asking = g.refresh();
  await g.forget();
  answer(new Response(JSON.stringify(NEVER), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await asking;
  expect(g.current()).toBe('unknown');
});
