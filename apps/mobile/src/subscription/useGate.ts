import { useSyncExternalStore } from 'react';

import type { GateState } from './gate';

/** The gate's state, rendered again whenever it changes: a purchase seen on the server opens the tabs at once (K-706). */
export function useGateState(gate: { current(): GateState; subscribe(listener: () => void): () => void }): GateState {
  return useSyncExternalStore(gate.subscribe, gate.current);
}
