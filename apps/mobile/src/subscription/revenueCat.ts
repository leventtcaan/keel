/**
 * The App Store through RevenueCat (K-702, ADR-057 D1): react-native-purchases behind SubscriptionStore. The SDK is a native
 * module; in Expo Go it swaps itself for JavaScript stand-ins that answer like real purchases (RevenueCat's Expo guide), so
 * there it is not loaded at all — `isRunningInExpoGo()`, as for HealthKit — and the store is not available. Nor is it without
 * the SDK key: a public key (RevenueCat: "Public API keys … must be used to configure the SDK"), still configuration, not code.
 *
 * The SDK is set up the first time it is needed, already as the account (`configure` with `appUserID`): RevenueCat never makes
 * an anonymous id here (ADR-056 #3 — the server ignores those), and a user who never opens the paywall sends RevenueCat nothing.
 * The installed 10.11.0 signatures (node_modules/react-native-purchases/dist/purchases.d.ts) are written out below.
 */
import { isRunningInExpoGo } from 'expo';

import type { Bought, Plan, SubscriptionStore } from './store';
import { storeUnavailable } from './store';

type IntroPrice = { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number };
type Package = {
  identifier: string;
  packageType: string;
  product: { identifier: string; priceString: string; pricePerMonthString: string | null; introPrice: IntroPrice | null };
};
type Sdk = {
  configure(configuration: { apiKey: string; appUserID?: string | null }): void;
  logIn(appUserID: string): Promise<unknown>;
  logOut(): Promise<unknown>;
  getOfferings(): Promise<{ current: { annual: Package | null; monthly: Package | null } | null }>;
  checkTrialOrIntroductoryPriceEligibility(productIdentifiers: string[]): Promise<Record<string, { status: number }>>;
  purchasePackage(aPackage: Package): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  showManageSubscriptions(): Promise<void>;
};

// PURCHASES_ERROR_CODE (the installed purchases-typescript-internal 19.5.0, generated/error-codes.d.ts).
const CANCELLED = '1';
const PENDING = '20';
// INTRO_ELIGIBILITY_STATUS_ELIGIBLE (offerings.d.ts): only then is a trial promised (ADR-057 D3). Unknown is not eligible.
const ELIGIBLE = 2;
const UNITS: Record<string, NonNullable<Plan['trial']>['unit']> = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

const named = (name: string, message: string) => Object.assign(new Error(message), { name });
/** RevenueCat's error code (PURCHASES_ERROR_CODE: a number as a string, no user data in it); none when the failure carries none. */
const codeOf = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^\d+$/.test(code) ? code : null;
};
/** By name only (V3): the SDK's message is not ours to show or log; its code says which failure it was. */
const storeError = (error: unknown) => {
  const code = codeOf(error);
  return named(code === null ? 'StoreError' : `StoreError_${code}`, 'the App Store could not be asked');
};
/** An SDK call whose failure is named by its code (StoreError_<code>). */
async function sdkCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw storeError(error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadSdk = () => (require('react-native-purchases') as { default: Sdk }).default;

type Deps = { load?: () => unknown; inExpoGo?: () => boolean; apiKey?: string; report?: (problem: { name: string }) => void };

export function revenueCatStore({
  load = loadSdk,
  inExpoGo = isRunningInExpoGo,
  // The static read is what Expo inlines at build time (as EXPO_PUBLIC_API_URL in api/config.ts).
  apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
  report = () => {},
}: Deps = {}): SubscriptionStore {
  if (inExpoGo() || apiKey === undefined || apiKey.trim() === '') return storeUnavailable;
  let sdk: Sdk;
  try {
    sdk = load() as Sdk;
  } catch {
    // The key is in the build but the SDK is not: a broken build, said by name — the user is told purchases are not here.
    report({ name: 'StoreModuleMissing' });
    return storeUnavailable;
  }
  const key = apiKey.trim();
  let configured = false;
  /** The account the SDK is set up as; none before the first and after a sign-out. */
  let account: string | null = null;
  /** The packages last shown, by id: only a plan the user saw can be bought. */
  let shown = new Map<string, Package>();

  const identified = () => {
    if (account === null) throw named('NotIdentified', 'no account is identified to the store');
  };

  const trialOf = (pkg: Package, eligibility: Record<string, { status: number }>): Plan['trial'] => {
    const intro = pkg.product.introPrice;
    const unit = intro === null ? undefined : UNITS[intro.periodUnit];
    // A free trial only: an introductory price is a discount, not a trial.
    if (intro === null || intro.price !== 0 || unit === undefined || eligibility[pkg.product.identifier]?.status !== ELIGIBLE) return null;
    return { count: intro.periodNumberOfUnits * intro.cycles, unit };
  };

  return {
    available: true,
    identify: async (appUserId) => {
      if (!configured) {
        sdk.configure({ apiKey: key, appUserID: appUserId });
        configured = true;
      } else if (account !== appUserId) {
        await sdkCall(() => sdk.logIn(appUserId));
      }
      account = appUserId;
    },
    forget: async () => {
      shown = new Map();
      if (!configured || account === null) return;
      account = null;
      await sdkCall(() => sdk.logOut());
    },
    plans: async () => {
      identified();
      const current = (await sdkCall(() => sdk.getOfferings())).current;
      const packages = [
        ['annual', current?.annual ?? null],
        ['monthly', current?.monthly ?? null],
      ].filter((entry): entry is [Plan['period'], Package] => entry[1] !== null);
      // Eligibility that cannot be read promises no trial (Apple's sheet states the real terms) and is reported: a check that
      // always failed would take the trial off every paywall without anyone knowing.
      const eligibility = await sdk.checkTrialOrIntroductoryPriceEligibility(packages.map(([, pkg]) => pkg.product.identifier)).catch(() => {
        report({ name: 'TrialEligibilityUnread' });
        return {} as Record<string, { status: number }>;
      });
      shown = new Map(packages.map(([, pkg]) => [pkg.identifier, pkg]));
      return packages.map(([period, pkg]) => ({
        id: pkg.identifier,
        period,
        price: pkg.product.priceString,
        pricePerMonth: period === 'annual' ? pkg.product.pricePerMonthString : null,
        trial: trialOf(pkg, eligibility),
      }));
    },
    buy: async (planId): Promise<Bought> => {
      identified();
      const pkg = shown.get(planId);
      if (pkg === undefined) throw named('UnknownPlan', 'only a plan shown can be bought');
      try {
        await sdk.purchasePackage(pkg);
        return 'bought';
      } catch (error) {
        const code = codeOf(error);
        if (code === CANCELLED) return 'cancelled';
        if (code === PENDING) return 'pending';
        // By name and code only: the store's message is not ours to show or log (V3).
        throw named(code === null ? 'PurchaseFailed' : `PurchaseFailed_${code}`, 'the purchase did not go through');
      }
    },
    restore: async () => {
      identified();
      await sdkCall(() => sdk.restorePurchases());
    },
    manage: async () => {
      identified();
      await sdkCall(() => sdk.showManageSubscriptions());
    },
  };
}
