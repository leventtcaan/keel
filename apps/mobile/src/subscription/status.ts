/**
 * What a subscription the server keeps (K-705) means on the App Store's side, for the screens that act on it: Settings ›
 * Subscription (K-702) and the account's deletion (K-811).
 */
import type { components } from '@/api/schema';

type Subscription = components['schemas']['Subscription'];

/** Something on the App Store to cancel or change: a subscription still running, or one the store is still trying to charge. */
export const hasStoreSubscription = (subscription: Subscription) =>
  subscription.active || subscription.status === 'BILLING_ISSUE' || subscription.status === 'PAUSED';

/**
 * Apple will charge again unless the user cancels: a trial (it turns into a paid period), a running period, one the store
 * is still trying to charge, a pause that resumes. A cancelled one is paid until its date and charged no more.
 */
export const billsOn = (subscription: Subscription) =>
  subscription.status === 'TRIAL' || subscription.status === 'ACTIVE' || subscription.status === 'BILLING_ISSUE' || subscription.status === 'PAUSED';
