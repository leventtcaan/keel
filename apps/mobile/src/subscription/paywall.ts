/**
 * The paywall's steps (K-702, ADR-057). Whether the subscription is on is the server's answer (GET /v1/subscription, K-705;
 * ADR-012: never the client's), and the account the store must know the purchase by is the one the server names
 * (`appUserId`, ADR-056 #3): no answer from the server, no purchase. After a purchase or a restore the store's webhook
 * reaches the server seconds to a minute later, so the phone asks again for a while (D2); not seen in time is "it can
 * take a minute" — never a failure, never a second purchase.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { load } from '@/today/today';

import { subscriptionParams } from './params';
import type { Bought, Plan, SubscriptionStore } from './store';

type Subscription = components['schemas']['Subscription'];
export type Wait = (ms: number) => Promise<void>;
type Deps = { api: ApiClient; store: SubscriptionStore };

export type Opened =
  | { state: 'plans'; plans: Plan[] }
  /** Active on the server already: nothing to sell. */
  | { state: 'subscribed'; subscription: Subscription }
  /** The server did not answer: a purchase could not be tied to the account. */
  | { state: 'offline' }
  /** Purchases are not in this build (Expo Go, no SDK key). */
  | { state: 'unavailable' }
  /** The store could not show its plans. */
  | { state: 'failed' };

/** The real wait between two looks. */
export const wait: Wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readSubscription = (api: ApiClient) => load(() => api.GET('/v1/subscription'));

/** The account the server names, identified to the store; throws by name when the server does not answer. */
async function identify({ api, store }: Deps): Promise<Subscription> {
  const read = await readSubscription(api);
  if (read.state !== 'ready') throw Object.assign(new Error('the subscription could not be read'), { name: 'NoConnection' });
  await store.identify(read.value.appUserId);
  return read.value;
}

export async function openPaywall(deps: Deps): Promise<Opened> {
  if (!deps.store.available) return { state: 'unavailable' };
  const read = await readSubscription(deps.api);
  if (read.state !== 'ready') return { state: 'offline' };
  if (read.value.active) return { state: 'subscribed', subscription: read.value };
  try {
    await deps.store.identify(read.value.appUserId);
    const plans = await deps.store.plans();
    return plans.length === 0 ? { state: 'failed' } : { state: 'plans', plans };
  } catch {
    return { state: 'failed' };
  }
}

/** Asks the server up to `subscription_confirm_attempts` times, the interval apart, whether access is on. */
export async function confirmActive(api: ApiClient, waitFor: Wait): Promise<boolean> {
  for (let look = 0; look < subscriptionParams.confirmAttempts; look++) {
    if (look > 0) await waitFor(subscriptionParams.confirmIntervalMs);
    const read = await readSubscription(api);
    // A look that fails (no connection, a server error) is one more look, not an answer.
    if (read.state === 'ready' && read.value.active) return true;
  }
  return false;
}

/** Apple's sheet for the plan (the store was identified when the paywall opened), then the server's word. */
export async function subscribe(deps: Deps & { wait: Wait }, planId: string): Promise<Exclude<Bought, 'bought'> | 'active' | 'waiting'> {
  const bought = await deps.store.buy(planId);
  if (bought !== 'bought') return bought;
  return (await confirmActive(deps.api, deps.wait)) ? 'active' : 'waiting';
}

/** The App Store's purchases for this Apple ID, given to the account the server names (from the paywall or Settings). */
export async function restorePurchases(deps: Deps & { wait: Wait }): Promise<'active' | 'waiting'> {
  await identify(deps);
  await deps.store.restore();
  return (await confirmActive(deps.api, deps.wait)) ? 'active' : 'waiting';
}
