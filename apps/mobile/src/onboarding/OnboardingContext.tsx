/**
 * The draft the onboarding screens share (K-306). It lives as long as the onboarding stack: going back and forth keeps
 * the answers; leaving the app before the end starts again (five minutes, ≤12 screens — not worth a stored draft). The
 * plan prepared after the last question lives here too (K-967): #ob-preparing fills it, #ob-plan shows it. Resumed after
 * a restart, it starts from the profile the server holds.
 */
import { type ReactNode, createContext, useContext, useState } from 'react';

import type { components } from '@/api/schema';

import { newClientId } from '@/sync/send';

import { type Draft, emptyDraft } from './draft';
import type { Progress } from './prepare';
import { suggestedAnswers } from './wheels';

type Value = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  progress: Progress;
  setProgress: (progress: Progress) => void;
  /** Resumed after the app was closed with the plan still to be seen (profileStatus › resume): the walk's answers are gone. */
  resumed: boolean;
};
const Context = createContext<Value | null>(null);

type Props = {
  children: ReactNode;
  /** The profile the server holds when onboarding resumes after a restart (K-967): the plan is prepared on it. */
  resumed?: components['schemas']['Profile'] | null;
};

export function OnboardingProvider({ children, resumed = null }: Props) {
  // The records' ids are made once for the draft, so a retry sends the same records (ADR-024). Height and year start on
  // the about-you wheels' suggestion (wheels.ts).
  const [draft, setDraft] = useState<Draft>(() => ({
    ...emptyDraft,
    ...suggestedAnswers(new Date().getFullYear()),
    ids: { weighIn: newClientId(), waist: newClientId() },
  }));
  const [progress, setProgress] = useState<Progress>(() => (resumed === null ? {} : { profile: resumed }));
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  return <Context.Provider value={{ draft, update, progress, setProgress, resumed: resumed !== null }}>{children}</Context.Provider>;
}

export function useDraft(): Value {
  const value = useContext(Context);
  if (value === null) throw new Error('useDraft outside OnboardingProvider');
  return value;
}
