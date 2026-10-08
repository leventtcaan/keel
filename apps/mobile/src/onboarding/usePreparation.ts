/**
 * #ob-preparing's work (prepare.ts): started once when the screen opens, and again on "Try again" from where it stopped.
 * One run at a time; a failure is said (no connection, or the server's refusal, worded apart) and reported by name.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

import { useDraft } from './OnboardingContext';
import { preparePlan } from './prepare';

export function usePreparation() {
  const { api, queue, profile, units, report, consents, training } = useAppServices();
  const { draft, update, progress, setProgress, resumed } = useDraft();
  const [busy, setBusy] = useState(false);
  // The program brought in is not on the server (K-968): the way on is bringing it in again, not trying again.
  const [missing, setMissing] = useState(false);
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
    setMissing(false);
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
        // The own moves' names when the server cannot be read: the copy kept at the import (K-968).
        keptOwn: () => training.keptOwn(),
        report,
        units: units.current(),
        now: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setMissing(name === 'ProgramMissing');
      const said = { NoConnection: 'onboarding.saveFailed', ProgramMissing: 'onboarding.preparing.programMissing' }[name];
      setProblem(t(said ?? 'onboarding.serverError'));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }, [api, consents, draft, profile, queue, report, resumed, setProblem, setProgress, training, units]);

  // Once, when the screen opens: the answers do not change here (no way back to them while it runs).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  /**
   * The program brought in again (#ob-own): what this screen got is dropped, so the profile is saved again with the
   * weekdays of the program brought in, and the plan prepared anew.
   */
  const bringAgain = () => {
    got.current = {};
    setProgress({});
    update({ ownProgram: null, reviewed: false });
    router.dismissTo('/onboarding/own-program');
  };

  return { run, busy, problem, occurrence, missing, bringAgain };
}
