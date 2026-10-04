/**
 * The App Store through RevenueCat (K-702, ADR-057 D1). Not loaded in Expo Go (the SDK's stand-ins there look like real
 * purchases) nor without the SDK key. The SDK is set up only when first needed, already as the account (no anonymous
 * id, ADR-056 #3); another account logs in, sign-out logs out. Prices and the trial come from the store; the trial is
 * promised only to someone who can still have it (Apple 3.1.2).
 */
import { revenueCatStore } from '@/subscription/revenueCat';

type Product = {
  identifier: string;
  priceString: string;
  pricePerMonthString: string | null;
  introPrice: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;
};
type Package = { identifier: string; packageType: string; product: Product };

const ANNUAL: Package = {
  identifier: '$rc_annual',
  packageType: 'ANNUAL',
  product: {
    identifier: 'keel_annual',
    priceString: '$59.99',
    pricePerMonthString: '$5.00',
    introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7, cycles: 1 },
  },
};
const MONTHLY: Package = {
  identifier: '$rc_monthly',
  packageType: 'MONTHLY',
  product: { identifier: 'keel_monthly', priceString: '$12.99', pricePerMonthString: '$12.99', introPrice: null },
};

function sdk(options: { annual?: Package | null; monthly?: Package | null; eligibility?: Record<string, number> | Error; buy?: unknown } = {}) {
  const calls: string[] = [];
  const fake = {
    calls,
    configure: jest.fn((configuration: { apiKey: string; appUserID?: string }) => void calls.push(`configure ${configuration.appUserID}`)),
    logIn: jest.fn(async (id: string) => void calls.push(`logIn ${id}`)),
    logOut: jest.fn(async () => void calls.push('logOut')),
    getOfferings: jest.fn(async () => ({
      current: {
        annual: options.annual === undefined ? ANNUAL : options.annual,
        monthly: options.monthly === undefined ? MONTHLY : options.monthly,
      },
    })),
    checkTrialOrIntroductoryPriceEligibility: jest.fn(async (ids: string[]) => {
      if (options.eligibility instanceof Error) throw options.eligibility;
      const status = options.eligibility ?? { keel_annual: 2, keel_monthly: 3 };
      return Object.fromEntries(ids.map((id) => [id, { status: status[id] ?? 0, description: '' }]));
    }),
    purchasePackage: jest.fn(async (pkg: Package) => {
      calls.push(`buy ${pkg.identifier}`);
      if (options.buy !== undefined) throw options.buy;
      return { productIdentifier: pkg.product.identifier };
    }),
    restorePurchases: jest.fn(async () => void calls.push('restore')),
    showManageSubscriptions: jest.fn(async () => void calls.push('manage')),
  };
  return fake;
}

const KEY = 'appl_public_test_key';
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const reported: string[] = [];
const report = (problem: { name: string }) => void reported.push(problem.name);
beforeEach(() => (reported.length = 0));
const make = (fake = sdk(), key: string | undefined = KEY) => revenueCatStore({ load: () => fake, inExpoGo: () => false, apiKey: key, report });

test('in Expo Go the SDK is not even loaded: its stand-ins would look like real purchases', () => {
  const load = jest.fn(() => sdk());
  expect(revenueCatStore({ load, inExpoGo: () => true, apiKey: KEY }).available).toBe(false);
  expect(load).not.toHaveBeenCalled();
});

test('without the SDK key in the build, purchases are not available (the key comes from configuration, not code)', () => {
  const load = jest.fn(() => sdk());
  expect(revenueCatStore({ load, inExpoGo: () => false, apiKey: undefined }).available).toBe(false);
  expect(revenueCatStore({ load, inExpoGo: () => false, apiKey: '  ' }).available).toBe(false);
  expect(load).not.toHaveBeenCalled();
});

test('an SDK that cannot be loaded (no native module) is not available', () => {
  const store = revenueCatStore({
    load: () => {
      throw new Error('native module missing');
    },
    inExpoGo: () => false,
    apiKey: KEY,
    report,
  });
  expect(store.available).toBe(false);
  expect(reported).toEqual(['StoreModuleMissing']); // a build with the key and no SDK is a broken build: said, not hidden
});

test('loading is not setting up: nothing reaches RevenueCat until an account is identified', () => {
  const fake = sdk();
  const store = make(fake);
  expect(store.available).toBe(true);
  expect(fake.configure).not.toHaveBeenCalled();
});

test('the SDK is set up once, as the account itself: never an anonymous id; the same account again changes nothing', async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await store.identify(ID);
  expect(fake.configure).toHaveBeenCalledTimes(1);
  expect(fake.configure).toHaveBeenCalledWith({ apiKey: KEY, appUserID: ID });
  expect(fake.logIn).not.toHaveBeenCalled();
});

test('another account logs in; after a sign-out the next account logs in too', async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await store.identify('11111111-2222-4333-8444-555555555555');
  await store.forget();
  await store.identify(ID);
  expect(fake.calls).toEqual([`configure ${ID}`, 'logIn 11111111-2222-4333-8444-555555555555', 'logOut', `logIn ${ID}`]);
});

test('forgetting before anything was set up asks nothing of the SDK', async () => {
  const fake = sdk();
  await make(fake).forget();
  expect(fake.calls).toEqual([]);
});

test('nothing is asked of the store before the account is identified: a purchase must reach this account', async () => {
  const store = make();
  await expect(store.plans()).rejects.toMatchObject({ name: 'NotIdentified' });
  await expect(store.buy('$rc_annual')).rejects.toMatchObject({ name: 'NotIdentified' });
  await expect(store.restore()).rejects.toMatchObject({ name: 'NotIdentified' });
});

test("the plans are the store's, annual first, with the store's prices and the trial for someone who can have it", async () => {
  const store = make();
  await store.identify(ID);
  expect(await store.plans()).toEqual([
    { id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } },
    { id: '$rc_monthly', period: 'monthly', price: '$12.99', pricePerMonth: null, trial: null },
  ]);
});

test.each([
  ['had it already', 1],
  ['not known', 0],
])('no trial is promised to someone who %s', async (_, status) => {
  const store = make(sdk({ eligibility: { keel_annual: status } }));
  await store.identify(ID);
  expect((await store.plans())[0].trial).toBeNull();
});

test('eligibility that cannot be read promises no trial and is reported; the plans still show', async () => {
  const store = make(sdk({ eligibility: new Error('offline') }));
  await store.identify(ID);
  const plans = await store.plans();
  expect(plans.map((plan) => plan.trial)).toEqual([null, null]);
  expect(plans).toHaveLength(2);
  expect(reported).toEqual(['TrialEligibilityUnread']);
});

test('an introductory price that is not free is not a free trial', async () => {
  const paidIntro = { ...ANNUAL, product: { ...ANNUAL.product, introPrice: { price: 0.99, periodUnit: 'MONTH', periodNumberOfUnits: 1, cycles: 1 } } };
  const store = make(sdk({ annual: paidIntro }));
  await store.identify(ID);
  expect((await store.plans())[0].trial).toBeNull();
});

test('a trial of several periods counts them all (one week, twice, is two weeks)', async () => {
  const twoWeeks = { ...ANNUAL, product: { ...ANNUAL.product, introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 2 } } };
  const store = make(sdk({ annual: twoWeeks }));
  await store.identify(ID);
  expect((await store.plans())[0].trial).toEqual({ count: 2, unit: 'week' });
});

test('a store with only one of the plans shows that one; with none, none', async () => {
  const onlyMonthly = make(sdk({ annual: null }));
  await onlyMonthly.identify(ID);
  expect((await onlyMonthly.plans()).map((plan) => plan.period)).toEqual(['monthly']);
  const none = make(sdk({ annual: null, monthly: null }));
  await none.identify(ID);
  expect(await none.plans()).toEqual([]);
});

test('buying takes the package from the plans shown; backing out and waiting for approval are not failures', async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await store.plans();
  expect(await store.buy('$rc_annual')).toBe('bought');
  expect(fake.purchasePackage).toHaveBeenCalledWith(ANNUAL);

  const cancelled = make(sdk({ buy: { code: '1', message: 'Purchase was cancelled.', userCancelled: true } }));
  await cancelled.identify(ID);
  await cancelled.plans();
  expect(await cancelled.buy('$rc_annual')).toBe('cancelled');

  const pending = make(sdk({ buy: { code: '20', message: 'The payment is pending.' } }));
  await pending.identify(ID);
  await pending.plans();
  expect(await pending.buy('$rc_monthly')).toBe('pending');
});

test("any other failure of a purchase throws by name, with RevenueCat's code — never the store's message (V3)", async () => {
  const store = make(sdk({ buy: { code: '2', message: 'There was a problem with the App Store.' } }));
  await store.identify(ID);
  await store.plans();
  const failure = await store.buy('$rc_annual').catch((error: Error) => error);
  expect(failure).toMatchObject({ name: 'PurchaseFailed_2' });
  expect((failure as Error).message).not.toContain('App Store');
});

test("the SDK's other failures are named by RevenueCat's code too, never its message", async () => {
  const fake = sdk();
  fake.getOfferings.mockRejectedValueOnce({ code: '10', message: 'network down for someone@example.com' });
  const store = make(fake);
  await store.identify(ID);
  const failure = await store.plans().catch((error: Error) => error);
  expect(failure).toMatchObject({ name: 'StoreError_10' });
  expect((failure as Error).message).not.toContain('example.com');
  fake.logOut.mockRejectedValueOnce(new Error('anonymous'));
  await expect(store.forget()).rejects.toMatchObject({ name: 'StoreError' });
});

test('signing the same account in again after a sign-out logs it in (never an anonymous id); a second forget asks nothing; the plans shown before are gone', async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await store.plans();
  await store.forget();
  await store.forget();
  await expect(store.plans()).rejects.toMatchObject({ name: 'NotIdentified' });
  await store.identify(ID);
  await expect(store.buy('$rc_annual')).rejects.toMatchObject({ name: 'UnknownPlan' });
  expect(fake.calls.filter((call) => !call.startsWith('buy'))).toEqual([`configure ${ID}`, 'logOut', `logIn ${ID}`]);
});

test('managing before the account is identified asks nothing of the SDK', async () => {
  const fake = sdk();
  await expect(make(fake).manage()).rejects.toMatchObject({ name: 'NotIdentified' });
  expect(fake.showManageSubscriptions).not.toHaveBeenCalled();
});

test('a trial in a unit not known here promises no trial', async () => {
  const odd = { ...ANNUAL, product: { ...ANNUAL.product, introPrice: { price: 0, periodUnit: 'FORTNIGHT', periodNumberOfUnits: 1, cycles: 1 } } };
  const store = make(sdk({ annual: odd }));
  await store.identify(ID);
  expect((await store.plans())[0].trial).toBeNull();
});

test('a plan that was not shown cannot be bought', async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await expect(store.buy('$rc_annual')).rejects.toMatchObject({ name: 'UnknownPlan' });
  await store.plans();
  await expect(store.buy('$rc_lifetime')).rejects.toMatchObject({ name: 'UnknownPlan' });
  expect(fake.purchasePackage).not.toHaveBeenCalled();
});

test("restoring and managing are the SDK's, after the account is identified", async () => {
  const fake = sdk();
  const store = make(fake);
  await store.identify(ID);
  await store.restore();
  await store.manage();
  expect(fake.calls).toEqual([`configure ${ID}`, 'restore', 'manage']);
});
