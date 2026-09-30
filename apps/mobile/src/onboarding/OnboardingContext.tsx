/**
 * The draft the onboarding screens share (K-306). It lives as long as the onboarding stack: going back and forth keeps
 * the answers; leaving the app before the end starts again (five minutes, ≤12 screens — not worth a stored draft).
 */
import { type ReactNode, createContext, useContext, useState } from 'react';

import { type Draft, emptyDraft } from './draft';

type Value = { draft: Draft; update: (patch: Partial<Draft>) => void };
const Context = createContext<Value | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  return <Context.Provider value={{ draft, update }}>{children}</Context.Provider>;
}

export function useDraft(): Value {
  const value = useContext(Context);
  if (value === null) throw new Error('useDraft outside OnboardingProvider');
  return value;
}
