/**
 * The program the user confirmed — from a file or typed in (K-968) — sent once, with the own moves it names made first
 * and only then (ADR-073 Ek 2; bringProgram.ts › sendWithOwnMoves); once kept, the onboarding goes on with it (its
 * weekdays the training days). One send at a time; a failure is said (no connection, or the server's no), and the same
 * program can go again, its own moves with the same clientIds.
 */
import { useRef, useState } from 'react';

import type { components } from '@/api/schema';
import { useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

import { sendWithOwnMoves } from './bringProgram';
import { broughtProgram } from './draft';
import { useChoose } from './StepFrame';

type Schemas = components['schemas'];

export function useSendOwnProgram() {
  const { api, training, report } = useAppServices();
  const choose = useChoose('ownProgram');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in one frame both see the state from before either ran.
  const sending = useRef(false);

  /** `own`: the own moves' answers, in order; `build`: the program from their ids, in that order. */
  async function send(own: Schemas['NewCustomExercise'][], build: (ids: string[]) => Schemas['OwnProgram'] | null): Promise<void> {
    if (sending.current) return;
    sending.current = true;
    setSaving(true);
    setProblem(null);
    try {
      choose(broughtProgram(await sendWithOwnMoves(api, (move) => training.saved(move), own, build)));
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setProblem(t(`onboarding.programImport.failed.${name === 'NoConnection' ? 'NoConnection' : 'other'}`));
    } finally {
      sending.current = false;
      setSaving(false);
    }
  }

  /** A failure said before is gone (another file chosen). */
  const clear = () => setProblem(null);

  return { send, clear, saving, problem, occurrence };
}
