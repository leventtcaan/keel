/** useReduceMotion follows the phone's setting, at start and as it changes (K-807). */
import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from '@/theme/useReduceMotion';

test('on at start, then off when the user turns it off', async () => {
  let changed: (on: boolean) => void = () => {};
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, handler: (on: boolean) => void) => {
    changed = handler;
    return { remove: () => {} };
  }) as never);
  const { result } = await renderHook(() => useReduceMotion());
  await act(async () => {});
  expect(result.current).toBe(true);
  await act(async () => changed(false));
  expect(result.current).toBe(false);
});

test('not readable: as on a phone without the setting', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('x'));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((() => ({ remove: () => {} })) as never);
  const { result } = await renderHook(() => useReduceMotion());
  await act(async () => {});
  expect(result.current).toBe(false);
});
