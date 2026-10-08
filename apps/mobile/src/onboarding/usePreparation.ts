/**
 * #ob-preparing's work (prepare.ts): started once when the screen opens, and again on "Try again" from where it stopped.
 * One run at a time; a failure is said (no connection, or the server's refusal, worded apart) and reported by name.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

import { useDraft } from './OnboardingContext';
import { preparePlan } from './prepare';

export function usePreparation() {
  const { api, queue, profile, units, report, consents } = useAppServices();
  const { draft, progress, setProgress, resumed } = useDraft();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share. The progress
  // too: a retry starts from what the last run got, not from what the screen last drew.
  const working = useRef(false);
  const got = useRef(progress);

  const run = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await preparePlan({
        draft,
        from: got.current,
        onProgress: (next) => {
          got.current = next;
          setProgress(next);
        },
        api,
        profile,
        queue,
        // Resumed, the walk's answer is gone: what the phone knows of the consent.
        consented: async () => (resumed ? consents.granted('HEALTH_DATA') : draft.healthConsent === 'granted'),
        units: units.current(),
        now: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setProblem(t(name === 'NoConnection' ? 'onboarding.saveFailed' : 'onboarding.serverError'));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }, [api, consents, draft, profile, queue, report, resumed, setProblem, setProgress, units]);

  // Once, when the screen opens: the answers do not change here (no way back to them while it runs).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return { run, busy, problem, occurrence };
}
