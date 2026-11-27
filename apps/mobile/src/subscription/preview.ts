/**
 * The paywall's preview (plan/evre-9-tasarim.md › 9b): the simulator has no App Store, so a development build shows the plans
 * at sample prices (data/parameters/subscription.json › paywall_preview_plans) and the paywall can be designed there. Only a
 * development build (__DEV__) with EXPO_PUBLIC_PAYWALL_PREVIEW=1 gets it: a release build never does, whatever its environment
 * says. The preview sells nothing — no Apple sheet, no charge, nothing told to the server — and whether access is on stays
 * the server's answer (ADR-012), as with the real store. The paywall still asks for both legal links (ADR-057 D3): a development
 * .env sets EXPO_PUBLIC_TERMS_URL and EXPO_PUBLIC_PRIVACY_URL as eas.json's production profile does.
 */
import { param } from './params';
import type { Plan, SubscriptionStore } from './store';

/** The sample plans, annual first, as the store would give them. */
export function previewPlans(): Plan[] {
  return param<Plan[]>('paywall_preview_plans');
}

const nothing = async () => undefined;

export const previewStore: SubscriptionStore = {
  available: true,
  identify: nothing,
  forget: nothing,
  plans: async () => previewPlans(),
  // As if the sheet were closed: the paywall stays as it was.
  buy: async () => 'cancelled',
  restore: nothing,
  manage: nothing,
};

/** The flag's one value that turns the preview on. */
const ON = '1';

/** The store this build gets: the preview only in a development build with the flag on; otherwise `real`, made only then. */
export function purchasesFor({ dev, flag, real }: { dev: boolean; flag: string | undefined; real: () => SubscriptionStore }): SubscriptionStore {
  return dev && flag === ON ? previewStore : real();
}
