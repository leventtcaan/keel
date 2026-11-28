/**
 * Apple's prompt through expo-store-review (K-1254): loaded when first needed, so a binary built before the module (an older
 * development build) runs on without it — no prompt, no rate row — instead of failing at launch.
 */
import { storeReviewFor } from '@/review/deviceStoreReview';

const missing = () => {
  throw new Error("Cannot find native module 'ExpoStoreReview'");
};

test('a binary without the module: asking throws by name, so nothing is counted; no write-review link', async () => {
  const review = storeReviewFor(missing);
  await expect(review.ask()).rejects.toMatchObject({ name: 'StoreReviewUnavailable' });
  expect(review.writeReviewUrl('action=write-review')).toBeNull();
});

test('TestFlight (not available): asking throws by name, Apple is not asked', async () => {
  const requestReview = jest.fn(async () => {});
  const review = storeReviewFor(() => ({ isAvailableAsync: async () => false, requestReview, storeUrl: () => null }));
  await expect(review.ask()).rejects.toMatchObject({ name: 'StoreReviewUnavailable' });
  expect(requestReview).not.toHaveBeenCalled();
});

test('available: Apple is asked; the link is the app page with Apple\'s query', async () => {
  const requestReview = jest.fn(async () => {});
  const review = storeReviewFor(() => ({ isAvailableAsync: async () => true, requestReview, storeUrl: () => 'https://apps.apple.com/app/id1' }));
  await review.ask();
  expect(requestReview).toHaveBeenCalledTimes(1);
  expect(review.writeReviewUrl('action=write-review')).toBe('https://apps.apple.com/app/id1?action=write-review');
});
