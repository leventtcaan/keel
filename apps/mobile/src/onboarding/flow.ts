/**
 * The onboarding's route (ADR-072 #2): one question per screen, in an order that branches on two answers. The new lifter
 * and the experienced one answer the same questions until the starting weights, which only the experienced are asked
 * (#3, #5); someone who brings a program has it brought in and reviewed instead of choosing days (ADR-073). Pure: the
 * screens, the step indicator and the tests share it.
 */
import type { components } from '@/api/schema';

import { onboardingParams as P } from './params';

type Schemas = components['schemas'];

/** The answers the route turns on; the draft carries them (draft.ts). */
export type Answers = {
  experience: Schemas['Experience'] | null;
  programChoice: Schemas['Profile']['programChoice'] | null;
  /** The program brought in (K-968): the starting weights are asked only for the moves it has. */
  ownProgram?: Schemas['Program'] | null;
};

export type Branch = 'newLifter' | 'experienced' | 'ownProgram';

export type Question =
  | 'goal'
  | 'experience'
  | 'program'
  | 'ownProgram'
  | 'review'
  | 'days'
  | 'consent'
  | 'about'
  | 'activity'
  | 'weights';

/** Bringing a program decides the branch whatever the experience; otherwise "just starting" (or no answer yet) is new. */
export function branchOf({ experience, programChoice }: Answers): Branch {
  if (programChoice === 'BRING_MY_OWN') return 'ownProgram';
  return experience !== null && experience !== 'NEW' ? 'experienced' : 'newLifter';
}

const START: Question[] = ['goal', 'experience', 'program'];
const YOU: Question[] = ['consent', 'about', 'activity'];
const BRANCHES: Record<Branch, readonly Question[]> = {
  newLifter: [...START, 'days', ...YOU],
  experienced: [...START, 'days', ...YOU, 'weights'],
  ownProgram: [...START, 'ownProgram', 'review', ...YOU, 'weights'],
};

/** Every question of a branch, in order, whether or not its screen is built yet. */
export function questionsOf(branch: Branch): readonly Question[] {
  return BRANCHES[branch];
}

/**
 * The steps that have a screen (each one a route, StepFrame's ROUTES). After the last step of a walk the plan is
 * prepared and shown (#ob-preparing, #ob-plan): not questions, so not steps of the indicator (prototype `obRoute`).
 */
export const SCREENS = ['goal', 'experience', 'program', 'ownProgram', 'review', 'days', 'consent', 'about', 'activity', 'weights'] as const;
export type Step = (typeof SCREENS)[number];

/**
 * Off every walk (ADR-069 #3, ADR-072 #8): the foods to avoid go to Settings (K-982), Apple Health to the first weigh-in
 * or workout (K-980). The code stays; nothing leads there, a link neither (app/onboarding/_layout.tsx).
 */
export const RETIRED_STEPS = ['foods', 'photos', 'expectations', 'appleHealth'] as const;
export type RetiredStep = (typeof RETIRED_STEPS)[number];

const isStep = (question: Question): question is Question & Step => (SCREENS as readonly string[]).includes(question);

/** A question without its screen is asked by the screen that asks it today, or skipped: every question has its screen now. */
const STAND_IN: Record<Exclude<Question, Step>, Step | null> = {
};

/** The starting-weight moves to ask about: on an own program brought in, only those it has (none: no weights step). */
export function startingWeightMoves(answers: Answers): string[] {
  const own = answers.ownProgram;
  if (branchOf(answers) !== 'ownProgram' || own === undefined || own === null) return P.startingWeightMoves;
  const planned = new Set(own.days.flatMap((day) => day.exercises.map((move) => move.exerciseId)));
  return P.startingWeightMoves.filter((move) => planned.has(move));
}

/** The screens this user goes through, in order. The last one ends the walk: the plan is prepared next (K-967). */
export function walk(answers: Answers): Step[] {
  const steps = questionsOf(branchOf(answers)).flatMap((question) => {
    if (question === 'weights' && startingWeightMoves(answers).length === 0) return [];
    const step = isStep(question) ? question : STAND_IN[question];
    return step === null ? [] : [step];
  });
  return [...new Set(steps)];
}

/** The step after this one for these answers; none after the last, or from a step this walk does not have. */
export function nextStep(step: Step | RetiredStep, answers: Answers): Step | null {
  const steps = walk(answers);
  const at = (steps as readonly string[]).indexOf(step);
  return at < 0 ? null : (steps[at + 1] ?? null);
}
