/**
 * The buttons on our own screens before a system permission or the health data consent (ADR-083, App Review 5.1.1(iv)):
 * the person decides, the app does not steer. Apple asks for "Continue" or "Next" there, never "Allow"; the choice itself is
 * Apple's sheet or the consent text on the screen. A settings row is not such a screen: it says "Turn on", as iOS does.
 */
import { t } from '@/copy';

const BEFORE_A_PERMISSION = [
  'onboarding.healthData.allow', // health data consent, before Apple Health
  'onboarding.appleHealth.connect', // Apple Health's read sheet
  'health.jit.continue', // Apple Health, asked when first used
  'weighIn.consent.allow',
  'meal.consent.allow',
  'state.consent.allow',
  'capture.allow', // the camera's sheet
];

test.each(BEFORE_A_PERMISSION)('%s says Continue', (key) => {
  expect(t(key)).toBe('Continue');
});

test('no button on the way to a permission asks for it: no Allow, Enable or Accept', () => {
  const steering = /\b(allow|enable|accept|grant)\b/i;
  for (const key of [...BEFORE_A_PERMISSION, 'meal.barcode.askAgain', 'thisWeek.food.allow', 'settings.consents.allow']) {
    expect({ key, words: t(key) }).toEqual({ key, words: expect.not.stringMatching(steering) });
  }
});
