/**
 * The gate's state as the root layout reads it (K-706): a change is rendered at once — a purchase seen on the server opens
 * the tabs without a restart.
 */
import { act, renderHook } from '@testing-library/react-native';

import { useGateState } from '@/subscription/useGate';

test('the hook follows the gate', async () => {
  let state: 'unknown' | 'required' | 'open' = 'required';
  const listeners = new Set<() => void>();
  const gate = {
    current: () => state,
    subscribe: (listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener)),
  };
  const { result } = await renderHook(() => useGateState(gate));
  expect(result.current).toBe('required');
  await act(async () => {
    state = 'open';
    listeners.forEach((listener) => listener());
  });
  expect(result.current).toBe('open');
});
