/**
 * When the queue drains by itself (K-304): at start, when the connection comes back, when the app returns to the front.
 */
import { type SyncTriggers, deviceTriggers, startAutoSync } from '@/sync/autoSync';

jest.mock('expo-network', () => ({ addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })) }));

function triggers() {
  let network: ((online: boolean) => void) | null = null;
  let foreground: (() => void) | null = null;
  const off = { network: jest.fn(), foreground: jest.fn() };
  const sources: SyncTriggers = {
    network: (listener) => {
      network = listener;
      return off.network;
    },
    foreground: (listener) => {
      foreground = listener;
      return off.foreground;
    },
  };
  return { sources, off, network: (online: boolean) => network?.(online), foreground: () => foreground?.() };
}

test('drains once at start', () => {
  const drain = jest.fn(async () => {});
  startAutoSync(drain, triggers().sources);
  expect(drain).toHaveBeenCalledTimes(1);
});

test('drains when the connection comes back, not on every report of being online', () => {
  const drain = jest.fn(async () => {});
  const t = triggers();
  startAutoSync(drain, t.sources);
  t.network(false);
  t.network(true);
  t.network(true);
  expect(drain).toHaveBeenCalledTimes(2);
  t.network(false);
  t.network(true);
  expect(drain).toHaveBeenCalledTimes(3);
});

test('a first "online" report drains even when no "offline" came before (Android opened offline)', () => {
  const drain = jest.fn(async () => {});
  const t = triggers();
  startAutoSync(drain, t.sources);
  t.network(true);
  expect(drain).toHaveBeenCalledTimes(2);
});

test('drains when the app comes back to the front', () => {
  const drain = jest.fn(async () => {});
  const t = triggers();
  startAutoSync(drain, t.sources);
  t.foreground();
  expect(drain).toHaveBeenCalledTimes(2);
});

test('stopping removes both listeners', () => {
  const t = triggers();
  const stop = startAutoSync(jest.fn(async () => {}), t.sources);
  stop();
  expect(t.off.network).toHaveBeenCalled();
  expect(t.off.foreground).toHaveBeenCalled();
});

describe('the device network report', () => {
  test('online only with a connection that is not known to lack the internet', () => {
    const { addNetworkStateListener } = jest.requireMock<typeof import('expo-network')>('expo-network');
    const seen: boolean[] = [];
    deviceTriggers.network((online) => seen.push(online));
    const report = (addNetworkStateListener as jest.Mock).mock.calls[0][0];
    report({ isConnected: true, isInternetReachable: true });
    report({ isConnected: true, isInternetReachable: undefined });
    report({ isConnected: true, isInternetReachable: false });
    report({ isConnected: false, isInternetReachable: undefined });
    expect(seen).toEqual([true, true, false, false]);
  });
});
