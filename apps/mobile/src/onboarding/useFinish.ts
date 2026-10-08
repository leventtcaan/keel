/**
 * Ending the walk (K-312, finish.ts): the profile is saved, then the health records go to the queue. Once the profile
 * lands the root layout leaves onboarding. One save at a time; a failure is said (no connection, or the server's
 * refusal, worded apart) and the same answers can go again.
 */
import { useRef, useState } from 'react';

import { useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

import type { Draft } from './draft';
import { finishOnboarding } from './finish';

export function useFinish() {
  const { queue, profile, units, report } = useAppServices();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const working = useRef(false);

  async function run(draft: Draft): Promise<void> {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await finishOnboarding({
        draft,
        units: units.current(),
        queue,
        profile,
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
  }

  return { run, busy, problem, occurrence };
}
