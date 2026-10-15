/** The server's answers for the Progress tab's tests (K-979): what each endpoint sends, built the way the contract describes. */
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

const SET = { loadKg: 100, reps: 8, day: '2026-10-05' };

export const lift = (exerciseId: string, stronger: boolean, over: Partial<Schemas['LiftProgress']> = {}): Schemas['LiftProgress'] => ({
  exerciseId,
  baseline: SET,
  best: stronger ? { ...SET, loadKg: 105 } : SET,
  stronger,
  weeks: [],
  ...over,
});

const LIFT_IDS = ['squat', 'bench_press', 'romanian_deadlift', 'overhead_press', 'barbell_row'];

/** `tracked` lifts of which `stronger` have a record after their baseline. */
export const training = (stronger: number, tracked: number, muscles: Schemas['MuscleSets'][] = []): Schemas['TrainingProgress'] => ({
  weekOf: '2026-10-12',
  muscles,
  lifts: Array.from({ length: tracked }, (_, i) => lift(LIFT_IDS[i] ?? `lift_${i}`, i < stronger)),
  strongerLifts: stronger,
  trackedLifts: tracked,
});

export const muscle = (name: string, planned: number, done: number): Schemas['MuscleSets'] => ({
  muscle: name,
  plannedSets: planned,
  doneSets: done,
  targetSets: 10,
  plannedShare: Math.min(1, planned / 10),
  doneShare: Math.min(1, done / 10),
});

export const consistency = (over: Partial<Schemas['Consistency']> = {}): Schemas['Consistency'] => ({
  weekOf: '2026-10-12',
  training: { planned: 3, done: 1 },
  protein: { planned: 7, done: 3 },
  steps: { planned: 7, done: 3 },
  weighIns: { planned: 4, done: 2 },
  planned: 17,
  done: 9,
  record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
  weeks: [],
  ...over,
});

/** `states` oldest first, ending the Monday before 2026-10-12 (the week in progress is not in it). */
export function weeks(states: Schemas['ConsistencyWeek']['state'][]): Schemas['ConsistencyWeek'][] {
  const last = Date.UTC(2026, 9, 5);
  return states.map((state, i) => ({
    weekOf: new Date(last - (states.length - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10),
    state,
  }));
}

export const budget = (over: Partial<Schemas['DayBudget']['eaten']> = {}): Schemas['DayBudget'] =>
  ({
    day: '2026-10-15',
    targetKcal: 2916,
    targetProteinG: 114,
    eaten: { kcal: { low: 0, high: 0 }, proteinG: { low: 0, high: 0 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 }, ...over },
    left: { kcal: { low: 2916, high: 2916 }, proteinG: { low: 114, high: 114 } },
  }) as Schemas['DayBudget'];

export const program = (cardio?: Partial<Schemas['ProgramCardio']>): Schemas['Program'] =>
  ({
    id: 'p',
    source: 'GENERATED',
    days: [],
    week: [],
    ...(cardio === undefined
      ? {}
      : { cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false, ...cardio } }),
  }) as Schemas['Program'];

export const starting = (): Schemas['StartingTarget'] => ({
  targetKcal: 2916,
  maintenanceKcal: { low: 2800, high: 3000 },
  observationDays: 14,
  proteinG: 114,
  stepsPerDay: 7000,
});

export const summary = (weighInCount: number, trendReady = false): Schemas['WeighInSummary'] => ({ weighInCount, trendMinWeighIns: 7, trendReady });

/** A lift's weekly best sets: `loads` per Monday week from 2026-09-07 on. */
export const liftWeeks = (loads: number[], held: number[] = []): Schemas['LiftProgress']['weeks'] =>
  loads.map((loadKg, i) => ({
    weekOf: new Date(Date.UTC(2026, 8, 7) + i * 7 * 86_400_000).toISOString().slice(0, 10),
    loadKg,
    reps: 8,
    rir: 1,
    held: held.includes(i),
  }));

/** The weight trend: `kg` per day ending 2026-10-15, one point a day. */
export const trendPoints = (kg: number[]): Schemas['TrendPoint'][] =>
  kg.map((value, i) => ({ day: new Date(Date.UTC(2026, 9, 15) - (kg.length - 1 - i) * 86_400_000).toISOString().slice(0, 10), kg: value }));

export const decision = (id: string, madeOn: string, over: Partial<Schemas['Decision']> = {}): Schemas['Decision'] =>
  ({
    id,
    madeOn,
    action: { type: 'CONTINUE' },
    reasons: [{ rule: 'toward_goal', source: { tag: 'EXPERIENCE' } }],
    confidence: 'HIGH',
    nextReview: '2026-10-19',
    copyKey: 'decision.continue.toward_goal',
    application: { state: 'APPLIED' },
    declinable: false,
    changes: [],
    ...over,
  }) as Schemas['Decision'];

export const decisionPage = (items: Schemas['Decision'][], next?: string): Schemas['DecisionPage'] => ({ items, ...(next === undefined ? {} : { next }) });
