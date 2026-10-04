/**
 * The App Store's side of the subscription (K-702, ADR-057 D1). The screens ask this, never a library: the phone plugs in
 * RevenueCat (revenueCat.ts), and where there is none — Expo Go, a build without the SDK key, tests — it is not available.
 * Whether the user has access is never asked here: that is the server's answer (GET /v1/subscription, ADR-012).
 */

/** A plan as the store sells it: its words come from the store (price, the store's own format), never from code (K2). */
export type Plan = {
  /** The store package's id: what `buy` takes. */
  id: string;
  period: 'annual' | 'monthly';
  /** The price as the store formats it for the user's storefront ("$59.99"). */
  price: string;
  /** An annual plan's price a month, as the store works it out; none for a monthly plan. */
  pricePerMonth: string | null;
  /** A free trial this user can still have (ADR-057 D3); none when there is none, or when they had it already. */
  trial: { count: number; unit: 'day' | 'week' | 'month' | 'year' } | null;
};

export type Bought = 'bought' | 'cancelled' | 'pending';

export type SubscriptionStore = {
  available: boolean;
  /** The account the purchases belong to: its opaque id from the server (ADR-056 #3). Before anything else. */
  identify(appUserId: string): Promise<void>;
  /** At sign-out: the purchases of the next person on this phone are not this account's. */
  forget(): Promise<void>;
  /** The plans on sale, annual first; none when the store has none to show. */
  plans(): Promise<Plan[]>;
  /**
   * Apple's purchase sheet for a plan from the last `plans()`. 'cancelled' when the user backed out; 'pending' when it
   * waits for someone's approval (Ask to Buy). Anything else throws, by name.
   */
  buy(planId: string): Promise<Bought>;
  /** The App Store's purchases for this Apple ID, given again to the account (Apple asks for this button). */
  restore(): Promise<void>;
  /** Apple's own page for the subscription: change the plan or cancel it (ADR-057 D4). */
  manage(): Promise<void>;
};

const unavailable = async (): Promise<never> => {
  throw Object.assign(new Error('purchases are not available in this build'), { name: 'StoreUnavailable' });
};

/** Where the App Store cannot be asked. */
export const storeUnavailable: SubscriptionStore = {
  available: false,
  identify: unavailable,
  forget: async () => undefined, // nothing was identified: nothing to forget
  plans: unavailable,
  buy: unavailable,
  restore: unavailable,
  manage: unavailable,
};
