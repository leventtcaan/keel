/**
 * Which parts of Progress are open and what the hero says (K-979, ADR-078 #1-#3, Ek 1, Ek 2). Every condition is a field
 * the server sent: the first call (Consistency answers), the first workout (a lift), the trend (trendReady). Nothing is
 * counted on the phone.
 */
import type { ProgressRead } from '@/progress/read';
import { heroOf, phaseOf, strengthOf, targetsOf, weighInDots } from '@/progress/sections';
import type { Loaded } from '@/today/today';

import { budget, consistency, program, starting, summary, training } from './support/progressFixtures';

const none = { state: 'none' } as const;
const consent = { state: 'consent' } as const;
const failed = { state: 'failed', problem: 'NoConnection' } as const;
const ready = <T>(value: T): Loaded<T> => ({ state: 'ready', value });

const CONSISTENCY = consistency;
const TRAINING = training;
const PROGRAM = program;
const BUDGET = budget();

/** The first day: nothing sent yet but the plan's starting numbers. */
const FIRST_DAY: ProgressRead = {
  training: ready(TRAINING(0, 0)),
  consistency: none,
  summary: ready(summary(3)),
  budget: ready(BUDGET),
  program: ready(PROGRAM({})),
  starting: ready(starting()),
  stepsToday: 3240,
  moves: new Map(),
};
const WEEK_12: ProgressRead = {
  ...FIRST_DAY,
  training: ready(TRAINING(4, 5)),
  consistency: ready(CONSISTENCY({ weightChange: { kg: -3.8, direction: 'DOWN', since: '2026-07-20' } })),
  summary: ready(summary(80, true)),
  starting: null,
};
const with_ = (read: ProgressRead, over: Partial<ProgressRead>): ProgressRead => ({ ...read, ...over });

describe('the phase', () => {
  test('no first call yet (the consistency has none): the first days', () => {
    expect(phaseOf(FIRST_DAY)).toBe('first');
  });

  test('the first call made (the consistency answers): running', () => {
    expect(phaseOf(WEEK_12)).toBe('running');
  });

  test('without the health data consent the calls are not there to read: locked', () => {
    expect(phaseOf(with_(FIRST_DAY, { consistency: consent }))).toBe('locked');
  });

  test('the consistency not read: unknown, never taken for a first day', () => {
    expect(phaseOf(with_(WEEK_12, { consistency: failed }))).toBe('unknown');
  });
});

describe('the four targets', () => {
  test('calories, protein, steps and cardio, in that order, each from its own field', () => {
    expect(targetsOf(FIRST_DAY)).toEqual([
      { kind: 'calories', eaten: { low: 0, high: 0 }, target: 2916 },
      { kind: 'protein', eaten: { low: 0, high: 0 }, target: 114 },
      { kind: 'steps', steps: 3240, target: 7000 },
      { kind: 'cardio', done: 0, count: 3, minutes: 30 },
    ]);
  });

  test('what was eaten stays the range the server sent (U5)', () => {
    const eaten = { ...BUDGET.eaten, kcal: { low: 1650, high: 1820 }, proteinG: { low: 70, high: 85 } };
    const [calories, protein] = targetsOf(with_(FIRST_DAY, { budget: ready({ ...BUDGET, eaten }) }));
    expect(calories).toEqual({ kind: 'calories', eaten: { low: 1650, high: 1820 }, target: 2916 });
    expect(protein).toEqual({ kind: 'protein', eaten: { low: 70, high: 85 }, target: 114 });
  });

  test('Health not read: the steps box stays, with no steps', () => {
    expect(targetsOf(with_(FIRST_DAY, { stepsToday: null }))[2]).toEqual({ kind: 'steps', steps: null, target: 7000 });
  });

  test('the cardio count is the server\'s: done this week of the sessions a week', () => {
    const program = ready(PROGRAM({ doneThisWeek: 2, sessionsPerWeek: 4, minutes: 25 }));
    expect(targetsOf(with_(FIRST_DAY, { program })).at(-1)).toEqual({ kind: 'cardio', done: 2, count: 4, minutes: 25 });
  });

  test('cardio turned off or no cardio: no cardio box', () => {
    expect(targetsOf(with_(FIRST_DAY, { program: ready(PROGRAM({ sessionsPerWeek: 0 })) })).map((x) => x.kind)).toEqual(['calories', 'protein', 'steps']);
    expect(targetsOf(with_(FIRST_DAY, { program: ready(PROGRAM()) })).map((x) => x.kind)).toEqual(['calories', 'protein', 'steps']);
    expect(targetsOf(with_(FIRST_DAY, { program: none })).map((x) => x.kind)).toEqual(['calories', 'protein', 'steps']);
  });

  test('no starting steps target: no steps box (nothing is made up)', () => {
    expect(targetsOf(with_(FIRST_DAY, { starting: none })).map((x) => x.kind)).toEqual(['calories', 'protein', 'cardio']);
    expect(targetsOf(with_(FIRST_DAY, { starting: failed })).map((x) => x.kind)).toEqual(['calories', 'protein', 'cardio']);
  });

  test('no day budget: no calories or protein', () => {
    expect(targetsOf(with_(FIRST_DAY, { budget: none })).map((x) => x.kind)).toEqual(['steps', 'cardio']);
  });

  test('without the health data consent only cardio is left (it is training, not health data)', () => {
    const locked = with_(FIRST_DAY, { consistency: consent, budget: consent, summary: consent, starting: consent });
    expect(targetsOf(locked).map((x) => x.kind)).toEqual(['cardio']);
  });
});

describe('the hero', () => {
  test('the first days: today\'s targets, tap one to log it', () => {
    expect(heroOf(FIRST_DAY, 'METRIC')).toEqual({ title: "Today's targets.", sub: 'Tap one to log it.' });
  });

  test('after the first workout: it says so, the targets stay', () => {
    expect(heroOf(with_(FIRST_DAY, { training: ready(TRAINING(0, 3)) }), 'METRIC')).toEqual({
      title: "First workout in. Today's targets.",
      sub: 'Tap one to log it.',
    });
  });

  test('with no box to tap there is nothing to tap', () => {
    const bare = with_(FIRST_DAY, { budget: none, starting: none, program: none });
    expect(heroOf(bare, 'METRIC')).toEqual({ title: "Today's targets.", sub: null });
  });

  test('the first call made: one sentence of results and the record', () => {
    expect(heroOf(WEEK_12, 'METRIC')).toEqual({ title: 'Stronger on 4 of 5 lifts. Down 3.8 kg.', sub: '12 weeks · 11 on track' });
  });

  test('the change in the user\'s unit', () => {
    expect(heroOf(WEEK_12, 'IMPERIAL')?.title).toBe('Stronger on 4 of 5 lifts. Down 8.4 lb.');
  });

  test.each([
    ['UP', 0.6, 'Up 0.6 kg.'],
    ['STEADY', 0.1, 'Weight steady.'],
  ] as const)('a %s change is said plainly, no alarm', (direction, kg, line) => {
    const consistency = ready(CONSISTENCY({ weightChange: { kg, direction, since: '2026-07-20' } }));
    expect(heroOf(with_(WEEK_12, { consistency, training: ready(TRAINING(0, 0)) }), 'METRIC')?.title).toBe(line);
  });

  test('no change sent (too few weigh-ins): the lifts alone', () => {
    const consistency = ready(CONSISTENCY());
    expect(heroOf(with_(WEEK_12, { consistency }), 'METRIC')?.title).toBe('Stronger on 4 of 5 lifts.');
  });

  test('stronger on none yet: that is not said (no 0 of 5); a single lift is "your lift"', () => {
    expect(heroOf(with_(WEEK_12, { training: ready(TRAINING(0, 5)) }), 'METRIC')?.title).toBe('Down 3.8 kg.');
    expect(heroOf(with_(WEEK_12, { training: ready(TRAINING(1, 1)) }), 'METRIC')?.title).toBe('Stronger on your lift. Down 3.8 kg.');
  });

  test('the training not read: the weight alone, the lifts are not guessed', () => {
    expect(heroOf(with_(WEEK_12, { training: failed }), 'METRIC')?.title).toBe('Down 3.8 kg.');
  });

  test('nothing to say yet after the first call: a plain line, and the record only once a week is over', () => {
    const early = with_(WEEK_12, { training: ready(TRAINING(0, 0)), consistency: ready(CONSISTENCY({ record: { onTrackWeeks: 0, countedWeeks: 0, currentRun: 0, forgivenWeeks: 0 } })) });
    expect(heroOf(early, 'METRIC')).toEqual({ title: 'Your numbers build week by week.', sub: null });
  });

  test('one week counted is "1 week"', () => {
    const one = with_(WEEK_12, { consistency: ready(CONSISTENCY({ record: { onTrackWeeks: 1, countedWeeks: 1, currentRun: 1, forgivenWeeks: 0 } })) });
    expect(heroOf(one, 'METRIC')?.sub).toBe('1 week · 1 on track');
  });

  test('the consistency not read: no hero (no first day shown to someone who is past it)', () => {
    expect(heroOf(with_(WEEK_12, { consistency: failed }), 'METRIC')).toBeNull();
  });
});

describe('strength', () => {
  test('no lift yet: locked, with a line saying what opens it', () => {
    expect(strengthOf(FIRST_DAY)).toBe('locked');
  });

  test('a lift with a working set: its baseline', () => {
    expect(strengthOf(with_(FIRST_DAY, { training: ready(TRAINING(0, 3)) }))).toBe('baseline');
  });

  test('not read: neither a lock nor a list', () => {
    expect(strengthOf(with_(FIRST_DAY, { training: failed }))).toBeNull();
  });
});

describe('the weigh-ins toward the trend', () => {
  test('3 of 7 so far', () => {
    expect(weighInDots(FIRST_DAY)).toEqual({ count: 3, min: 7 });
  });

  test('never more dots than the trend needs', () => {
    const nine = ready(summary(9));
    expect(weighInDots(with_(FIRST_DAY, { summary: nine }))).toEqual({ count: 7, min: 7 });
  });

  test('the trend ready: no dots (the trend takes the place)', () => {
    expect(weighInDots(WEEK_12)).toBeNull();
  });

  test('no consent or not read: no card', () => {
    expect(weighInDots(with_(FIRST_DAY, { summary: consent }))).toBeNull();
    expect(weighInDots(with_(FIRST_DAY, { summary: failed }))).toBeNull();
  });
});
