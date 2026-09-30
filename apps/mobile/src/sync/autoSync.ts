/**
 * When the queue drains by itself (K-304): at start, when the connection comes back, and when the app returns to the
 * front. Saving a record starts a drain too (queue.ts). The event sources are passed in, so this is testable without a
 * phone; `deviceTriggers` wires the real ones.
 */
import { AppState } from 'react-native';
import { addNetworkStateListener } from 'expo-network';

export type SyncTriggers = {
  /** Reports whether the phone can reach the internet; answers the function that stops listening. */
  network: (listener: (online: boolean) => void) => () => void;
  foreground: (listener: () => void) => () => void;
};

export function startAutoSync(drain: () => Promise<unknown>, triggers: SyncTriggers): () => void {
  let online = true;
  const stopNetwork = triggers.network((now) => {
    if (now && !online) void drain();
    online = now;
  });
  const stopForeground = triggers.foreground(() => void drain());
  void drain();
  return () => {
    stopNetwork();
    stopForeground();
  };
}

export const deviceTriggers: SyncTriggers = {
  network: (listener) => {
    // isInternetReachable is unknown (undefined) for a moment after a change; only a definite "no" counts as offline.
    const subscription = addNetworkStateListener((state) =>
      listener(state.isConnected === true && state.isInternetReachable !== false),
    );
    return () => subscription.remove();
  },
  foreground: (listener) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') listener();
    });
    return () => subscription.remove();
  },
};
