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

/** `drain` must not reject (queue.drainInBackground). Start it once for the app's life, not per screen. */
export function startAutoSync(drain: () => void, triggers: SyncTriggers): () => void {
  // Unknown at start: Android reports nothing while there is no network, so the first "online" must count.
  let online: boolean | null = null;
  const stopNetwork = triggers.network((now) => {
    if (now && online !== true) drain();
    online = now;
  });
  const stopForeground = triggers.foreground(drain);
  drain();
  return () => {
    stopNetwork();
    stopForeground();
  };
}

export const deviceTriggers: SyncTriggers = {
  network: (listener) => {
    // isInternetReachable is optional in the type; only a definite "no" counts as offline.
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
