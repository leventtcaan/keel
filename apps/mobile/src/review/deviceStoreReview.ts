/**
 * Apple's rating prompt on the phone (K-1254, ADR-095), through expo-store-review (~57.0.3, docs.expo.dev v57 › StoreReview:
 * `isAvailableAsync`, `requestReview`, `storeUrl`). On iOS it is SKStoreReviewController: Apple decides whether to show it
 * (at most three times in 365 days) and never in TestFlight, where `isAvailableAsync` is false — then it throws by name, so
 * the request is not counted. Never called from a tap (StoreKit), only by reviewPrompt.ts after a finish.
 *
 * The module is native: a binary built before it (an older development build) does not have it. It is loaded the first time
 * it is needed, as the RevenueCat SDK is (revenueCat.ts), so such a binary runs on — without the prompt and the rate row —
 * instead of failing at launch.
 */
import { requireOptionalNativeModule } from 'expo';

type StoreReviewModule = { isAvailableAsync(): Promise<boolean>; requestReview(): Promise<void>; storeUrl(): string | null };

/**
 * The package only where the binary has its native half ('ExpoStoreReview', the name the package itself asks for): asking
 * first keeps an older binary from the package's own failing lookup, which a development build reports as an error.
 */
const defaultLoad = (): StoreReviewModule => {
  if (requireOptionalNativeModule('ExpoStoreReview') === null) throw new Error('ExpoStoreReview is not in this binary');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-store-review') as StoreReviewModule;
};

const unavailable = () => Object.assign(new Error('no rating prompt in this build'), { name: 'StoreReviewUnavailable' });

/** The module, or null where the binary has none. */
function moduleOf(load: () => StoreReviewModule): StoreReviewModule | null {
  try {
    return load();
  } catch {
    return null;
  }
}

export function storeReviewFor(load: () => StoreReviewModule = defaultLoad) {
  return {
    /** Apple's prompt; throws by name where there is none (this binary, TestFlight, Expo Go). */
    ask: async (): Promise<void> => {
      const module = moduleOf(load);
      if (module === null || !(await module.isAvailableAsync())) throw unavailable();
      await module.requestReview();
    },
    /** The App Store's write-review page: the app's page (app.config.ts › ios.appStoreUrl) and Apple's query; none without either. */
    writeReviewUrl: (query: string): string | null => {
      const page = moduleOf(load)?.storeUrl() ?? null;
      return page === null ? null : `${page}${page.includes('?') ? '&' : '?'}${query}`;
    },
  };
}

const device = storeReviewFor();
export const deviceStoreReview = device.ask;
export const writeReviewUrl = device.writeReviewUrl;
