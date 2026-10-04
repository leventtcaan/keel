/**
 * The paywall's steps (K-702, ADR-057): whether the subscription is on is the server's answer (K-705), never the store's.
 * The store is identified as the account the server names before anything is bought — no server, no purchase (a purchase
 * under another id never reaches the account). After a purchase or a restore the phone asks the server again for a while
 * (the webhook comes later); not seen in time is "it can take a minute", never a failure and never a second purchase.
 */
import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { confirmActive, openPaywall, restorePurchases, subscribe } from '@/subscription/paywall';
import { subscriptionParams } from '@/subscription/params';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { storeUnavailable } from '@/subscription/store';
import { load } from '@/today/today';

type Subscription = components['schemas']['Subscription'];
const BASE = 'https://api.example.test';
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: ID };
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2026-10-11T12:00:00Z' };
const PLANS: Plan[] = [
  { id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } },
  { id: '$rc_monthly', period: 'monthly', price: '$12.99', pricePerMonth: null, trial: null },
];

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A server answering GET /v1/subscription with each answer in turn (the last one repeated); a thrown answer is no connection. */
function server(...answers: (Subscription | number | 'offline')[]) {
  const asked: string[] = [];
  let at = 0;
  const fetch = jest.fn(async (request: Request) => {
    asked.push(new URL(request.url).pathname);
    const answer = answers[Math.min(at++, answers.length - 1)];
    if (answer === 'offline') throw new TypeError('Network request failed');
    return typeof answer === 'number' ? json(answer, { code: 'INTERNAL', message: 'x' }) : json(200, answer);
  });
  return { api: createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch }), asked };
}

function store(overrides: Partial<SubscriptionStore> = {}): SubscriptionStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    available: true,
    identify: jest.fn(async (id: string) => void calls.push(`identify ${id}`)),
    forget: jest.fn(async () => void calls.push('forget')),
    plans: jest.fn(async () => (calls.push('plans'), PLANS)),
    buy: jest.fn(async (id: string) => (calls.push(`buy ${id}`), 'bought' as const)),
    restore: jest.fn(async () => void calls.push('restore')),
    manage: jest.fn(async () => void calls.push('manage')),
    ...overrides,
  };
}

const waits: number[] = [];
const wait = async (ms: number) => void waits.push(ms);
const reported: string[] = [];
const report = (problem: { name: string }) => void reported.push(problem.name);
const LINKS = [
  { key: 'subscription.terms', url: 'https://example.test/terms' },
  { key: 'subscription.privacy', url: 'https://example.test/privacy' },
];
beforeEach(() => {
  waits.length = 0;
  reported.length = 0;
});

describe('opening the paywall', () => {
  test('the store is identified as the account the server names, then shows its plans', async () => {
    const fake = store();
    expect(await openPaywall({ api: server(NONE).api, store: fake, report, links: LINKS })).toEqual({ state: 'plans', plans: PLANS });
    expect(fake.calls).toEqual([`identify ${ID}`, 'plans']);
  });

  test('already active on the server: nothing to sell, the store is not asked for plans', async () => {
    const fake = store();
    expect(await openPaywall({ api: server(TRIAL).api, store: fake, report, links: LINKS })).toEqual({ state: 'subscribed', subscription: TRIAL });
    expect(fake.plans).not.toHaveBeenCalled();
  });

  test.each([['no connection', 'offline'] as const, ['a server error', 500] as const])(
    'the server not answering (%s): no purchase can be tied to the account, so none is offered',
    async (_, answer) => {
      const fake = store();
      expect(await openPaywall({ api: server(answer).api, store: fake, report, links: LINKS })).toEqual({ state: 'offline' });
      expect(fake.identify).not.toHaveBeenCalled();
    },
  );

  test('not in this build: said so, and the server is not even asked', async () => {
    const { api, asked } = server(NONE);
    expect(await openPaywall({ api, store: storeUnavailable, report, links: LINKS })).toEqual({ state: 'unavailable' });
    expect(asked).toEqual([]);
  });

  test('a store with no plans, or one that fails, says it cannot show them — and says why, by name, to the developer', async () => {
    expect(await openPaywall({ api: server(NONE).api, store: store({ plans: async () => [] }), report, links: LINKS })).toEqual({ state: 'failed' });
    const failing = store({
      plans: async () => {
        throw Object.assign(new Error('x'), { name: 'StoreError_10' });
      },
    });
    expect(await openPaywall({ api: server(NONE).api, store: failing, report, links: LINKS })).toEqual({ state: 'failed' });
    expect(reported).toEqual(['NoPlans', 'StoreError_10']);
  });

  test.each([
    ['none', []],
    ['only the terms', LINKS.slice(0, 1)],
  ])('without both legal links in the build (%s), nothing is sold (Apple 3.1.2): said, the store not asked', async (_, links) => {
    const fake = store();
    const { api, asked } = server(NONE);
    expect(await openPaywall({ api, store: fake, report, links })).toEqual({ state: 'incomplete' });
    expect(fake.identify).not.toHaveBeenCalled();
    expect(asked).toEqual([]);
  });
});

describe('after a purchase, the server is asked until it sees it', () => {
  test('seen on the third look: active, after two waits of the interval', async () => {
    const { api, asked } = server(NONE, NONE, TRIAL);
    expect(await subscribe({ api, store: store(), wait }, '$rc_annual')).toBe('active');
    expect(asked).toEqual(['/v1/subscription', '/v1/subscription', '/v1/subscription']);
    expect(waits).toEqual([subscriptionParams.confirmIntervalMs, subscriptionParams.confirmIntervalMs]);
  });

  test('not seen in time: waiting — the number of looks is the parameter, and nothing is bought again', async () => {
    const fake = store();
    const { api, asked } = server(NONE);
    expect(await subscribe({ api, store: fake, wait }, '$rc_annual')).toBe('waiting');
    expect(asked).toHaveLength(subscriptionParams.confirmAttempts);
    expect(waits).toHaveLength(subscriptionParams.confirmAttempts - 1);
    expect(fake.buy).toHaveBeenCalledTimes(1);
  });

  test('a look that fails (no connection) is one more look, not an answer', async () => {
    const { api } = server('offline', 500, TRIAL);
    expect(await subscribe({ api, store: store(), wait }, '$rc_annual')).toBe('active');
  });

  test.each(['cancelled', 'pending'] as const)('a purchase %s: the server is not asked', async (bought) => {
    const { api, asked } = server(TRIAL);
    expect(await subscribe({ api, store: store({ buy: async () => bought }), wait }, '$rc_annual')).toBe(bought);
    expect(asked).toEqual([]);
  });

  test('a purchase that fails throws by name after one look at the server — not the whole wait', async () => {
    const { api, asked } = server(NONE);
    const failing = store({
      buy: async () => {
        throw Object.assign(new Error('x'), { name: 'PurchaseFailed_2' });
      },
    });
    await expect(subscribe({ api, store: failing, wait }, '$rc_annual')).rejects.toMatchObject({ name: 'PurchaseFailed_2' });
    expect(asked).toEqual(['/v1/subscription']);
  });

  test('a purchase that "fails" after Apple charged (RevenueCat could not send the receipt): the server already has it — active', async () => {
    const failing = store({
      buy: async () => {
        throw Object.assign(new Error('x'), { name: 'PurchaseFailed_10' });
      },
    });
    expect(await subscribe({ api: server(TRIAL).api, store: failing, wait }, '$rc_annual')).toBe('active');
  });

  test('confirmActive stops at the first active answer', async () => {
    const { api, asked } = server(TRIAL);
    expect(await confirmActive(api, wait)).toBe(true);
    expect(asked).toHaveLength(1);
    expect(waits).toEqual([]);
  });
});

describe('restoring', () => {
  test("the store's restore, then the server is asked the same way", async () => {
    const fake = store();
    const { api } = server(NONE, TRIAL);
    expect(await restorePurchases({ api, store: fake, wait })).toBe('active');
    expect(fake.calls).toEqual([`identify ${ID}`, 'restore']);
  });

  test('restoring first identifies the account the server names (from Settings, without the paywall)', async () => {
    const fake = store();
    await restorePurchases({ api: server(TRIAL).api, store: fake, wait });
    expect(fake.calls[0]).toBe(`identify ${ID}`);
  });

  test('nothing seen: waiting', async () => {
    expect(await restorePurchases({ api: server(NONE).api, store: store(), wait })).toBe('waiting');
  });

  test('the server not answering at first: no restore under an unknown id', async () => {
    const fake = store();
    await expect(restorePurchases({ api: server('offline').api, store: fake, wait })).rejects.toMatchObject({ name: 'NoConnection' });
    expect(fake.restore).not.toHaveBeenCalled();
  });
});

test('the wait is the parameter file\'s, read as written', () => {
  const file = jest.requireActual('../../../../data/parameters/subscription.json') as { parameters: { key: string; value: number }[] };
  const value = (key: string) => file.parameters.find((p) => p.key === key)?.value;
  expect(subscriptionParams).toEqual({
    confirmAttempts: value('subscription_confirm_attempts'),
    confirmIntervalMs: value('subscription_confirm_interval_ms'),
    trialReminderDaysBefore: value('trial_reminder_days_before'),
  });
});

test("load tells the subscription's 403 apart from the consent's (K-703: ENTITLEMENT_REQUIRED opens the way to the plans)", async () => {
  const fetch = jest.fn(async () => json(403, { code: 'ENTITLEMENT_REQUIRED', message: 'A subscription is needed for this.' }));
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch });
  expect(await load(() => api.POST('/v1/coach/messages', { body: { text: 'why?' } }))).toEqual({ state: 'subscription' });
});
