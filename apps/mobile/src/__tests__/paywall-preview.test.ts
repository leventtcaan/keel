/**
 * The paywall's preview (plan/evre-9-tasarim.md › 9b): a development build with the flag on shows the plans at the sample
 * prices of data/parameters/subscription.json, so the paywall can be designed on the simulator, where the App Store is not.
 * Only both together: a release build (__DEV__ false) gets the real store whatever the flag says, and so does a development
 * build without the flag. The preview sells nothing: no sheet, no charge, nothing told to the server.
 */
import { previewPlans, previewStore, purchasesFor } from '@/subscription/preview';
import type { SubscriptionStore } from '@/subscription/store';

const real = { available: true } as SubscriptionStore;

describe('which store the build gets', () => {
  test('a development build with the flag on: the preview', () => {
    expect(purchasesFor({ dev: true, flag: '1', real: () => real })).toBe(previewStore);
  });

  test('a release build: the real store, even with the flag on', () => {
    const make = jest.fn(() => real);
    expect(purchasesFor({ dev: false, flag: '1', real: make })).toBe(real);
    expect(make).toHaveBeenCalledTimes(1);
  });

  test.each([undefined, '', '0', 'true', ' 1'])('a development build with the flag %p: the real store', (flag) => {
    expect(purchasesFor({ dev: true, flag, real: () => real })).toBe(real);
  });

  test('the preview never builds the real store', () => {
    const make = jest.fn(() => real);
    purchasesFor({ dev: true, flag: '1', real: make });
    expect(make).not.toHaveBeenCalled();
  });
});

describe('the preview', () => {
  test('the sample plans: annual first, then monthly, each with a price as the store would format it', () => {
    const plans = previewPlans();
    expect(plans.map((plan) => plan.period)).toEqual(['annual', 'monthly']);
    for (const plan of plans) {
      expect(plan.id).not.toBe('');
      expect(plan.price).not.toBe('');
      expect(plan.amount).toBeGreaterThan(0);
      expect(plan.currency).toMatch(/^[A-Z]{3}$/);
    }
    expect(plans[0].pricePerMonth).not.toBeNull();
    expect(plans[1].pricePerMonth).toBeNull();
  });

  test('available, and its plans are the sample plans', async () => {
    expect(previewStore.available).toBe(true);
    await previewStore.identify('account');
    expect(await previewStore.plans()).toEqual(previewPlans());
  });

  test('buying sells nothing: it comes back as if the sheet were closed', async () => {
    expect(await previewStore.buy(previewPlans()[0].id)).toBe('cancelled');
  });

  test('restore, manage and forget do nothing and never throw', async () => {
    await expect(previewStore.restore()).resolves.toBeUndefined();
    await expect(previewStore.manage()).resolves.toBeUndefined();
    await expect(previewStore.forget()).resolves.toBeUndefined();
  });
});
