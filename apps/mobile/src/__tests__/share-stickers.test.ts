// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * The four stickers' words (K-975, ADR-076 #2): what each says, from the server's numbers as they are. Workout: the
 * session's day, minutes, kilos lifted, sets and the record (or the baseline). PR: the move, the real best set, the kilos
 * gained since its baseline. Streak: weeks on track and the grid. Progress: weeks in and the lifts that gained the most.
 * Never a body weight, a calorie, a body fat or an estimated max (U4, V3, B10), never blame (U7); every text is held to
 * the forbidden phrases, and the stickers to the share list.
 */
import en from '../../../../data/copy/en.json';
import forbidden from '../../../../data/copy/forbidden-phrases.json';
import shareForbidden from '../../../../data/copy/share-forbidden.json';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type Sticker, type StickerFacts, stickersFor } from '@/share/stickers';
import type { Move } from '@/train/trainData';
import type { WorkoutEnd } from '@/train/workoutEnd';

type Schemas = components['schemas'];
type Ready = Extract<WorkoutEnd, { kind: 'ready' }>;

const move = (id: string, name?: string): Move =>
  ({ id, nameKey: `exercises.${id}.name`, name, kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }) as Move;
const MOVES = new Map([move('squat'), move('romanian_deadlift'), move('seated_row'), move('bench_press'), move('overhead_press')].map((m) => [m.id, m] as const));

const END: Ready = {
  kind: 'ready',
  summary: {
    workoutId: 'w1',
    liftedKg: 4280,
    liftedChangePercent: 6,
    workingSets: 14,
    minutes: 52,
    marks: [{ exerciseId: 'squat', kind: 'RECORD', loadKg: 100, reps: 8 }],
    moves: [],
    weekOf: '2026-10-12',
    muscles: [],
  },
  program: { days: [{ id: 'day-a', nameKey: 'programDays.full_body_a.name', exercises: [] }] } as unknown as Schemas['Program'],
  programDayId: 'day-a',
  week: { done: 3, planned: 3 },
  // An Apple Watch's number is in the end screen's facts: it must never reach a sticker.
  kcal: 310,
  moves: MOVES,
};

const dated = (loadKg: number, reps: number, day: string) => ({ loadKg, reps, day });
const lift = (exerciseId: string, from: number, to: number): Schemas['LiftProgress'] => ({
  exerciseId,
  baseline: dated(from, 8, '2026-07-13'),
  best: dated(to, 8, '2026-10-12'),
  stronger: to > from,
  weeks: [],
});
const PROGRESS: Schemas['TrainingProgress'] = {
  weekOf: '2026-10-12',
  muscles: [],
  lifts: [lift('bench_press', 70, 72.5), lift('squat', 80, 100), lift('romanian_deadlift', 70, 90), lift('seated_row', 50, 60), lift('overhead_press', 40, 40)],
  strongerLifts: 4,
  trackedLifts: 5,
};

const CONSISTENCY: Schemas['Consistency'] = {
  weekOf: '2026-10-12',
  training: { done: 3, planned: 3 },
  protein: { done: 5, planned: 7 },
  steps: { done: 5, planned: 7 },
  weighIns: { done: 6, planned: 7 },
  planned: 24,
  done: 18,
  record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
  weeks: ['ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'SPARE', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK'].map((state, i) => ({
    weekOf: `2026-07-${String(i + 1).padStart(2, '0')}`,
    state: state as Schemas['ConsistencyWeek']['state'],
  })),
} as Schemas['Consistency'];

const FULL: StickerFacts = { workout: END, consistency: CONSISTENCY, progress: PROGRESS, moves: MOVES };
const kind = (stickers: Sticker[], k: Sticker['kind']) => stickers.find((s) => s.kind === k);
const words = (s: Sticker) => [s.kicker, s.title, ...s.stats.flatMap((x) => [x.value, x.label]), ...s.lines];

test('with everything known: the four stickers, in the order the user picks from', () => {
  expect(stickersFor(FULL, 'METRIC').map((s) => s.kind)).toEqual(['workout', 'pr', 'streak', 'progress']);
});

test("Workout: the session's day, its minutes, kilos lifted, sets and the record's real set", () => {
  const workout = kind(stickersFor(FULL, 'METRIC'), 'workout')!;
  expect(workout.kicker).toBe(t('workoutEnd.title'));
  expect(workout.title).toBe(t('programDays.full_body_a.name'));
  expect(workout.stats).toEqual([
    { value: '52', label: t('workoutEnd.minutes.other') },
    { value: '4,280', label: t('workoutEnd.liftedKg'), accent: true },
    { value: '14', label: t('workoutEnd.sets.other') },
    { value: '100 kg × 8', label: t('share.sticker.workout.recordLabel', { move: t('exercises.squat.name').toLowerCase() }) },
  ]);
});

test('Workout in pounds: the load and the record in the unit they chose', () => {
  const workout = kind(stickersFor(FULL, 'IMPERIAL'), 'workout')!;
  expect(workout.stats[1]).toMatchObject({ value: '9,435', label: t('workoutEnd.liftedLb') });
  expect(workout.stats[3].value).toBe('220 lb × 8');
});

test('Workout of a first session: the baseline in the record is not a record; one minute and one set read in the singular', () => {
  const first: Ready = { ...END, summary: { ...END.summary, minutes: 1, workingSets: 1, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }] } };
  const workout = kind(stickersFor({ ...FULL, workout: first }, 'METRIC'), 'workout')!;
  expect(workout.stats[0]).toEqual({ value: '1', label: t('workoutEnd.minutes.one') });
  expect(workout.stats[2]).toEqual({ value: '1', label: t('workoutEnd.sets.one') });
  expect(workout.stats[3]).toEqual({ value: t('share.sticker.workout.baselineValue'), label: t('share.sticker.workout.baselineLabel') });
});

test('Workout without a length (a session closed by itself) leaves the minutes out; without a record, the fourth cell too', () => {
  const bare: Ready = { ...END, summary: { ...END.summary, minutes: undefined, marks: [] } };
  const workout = kind(stickersFor({ ...FULL, workout: bare }, 'METRIC'), 'workout')!;
  expect(workout.stats.map((s) => s.label)).toEqual([t('workoutEnd.liftedKg'), t('workoutEnd.sets.other')]);
});

test("Workout of a day the program does not hold (a workout of the user's own): the plain word", () => {
  const free: Ready = { ...END, programDayId: null };
  expect(kind(stickersFor({ ...FULL, workout: free }, 'METRIC'), 'workout')!.title).toBe(t('share.sticker.workout.plain'));
});

test('PR: the move, the real best set, the kilos gained since its baseline and when that was', () => {
  const pr = kind(stickersFor(FULL, 'METRIC'), 'pr')!;
  expect(pr.kicker).toBe(t('share.sticker.pr.kicker'));
  expect(pr.title).toBe(t('exercises.squat.name'));
  expect(pr.stats).toEqual([
    { value: '100 kg × 8', label: t('share.sticker.pr.best'), accent: true },
    { value: '+20 kg', label: t('share.sticker.pr.since', { date: 'Jul 13' }) },
  ]);
});

test("PR of a move the user named themselves is called by their name", () => {
  const own = new Map(MOVES).set('squat', move('squat', 'Box squat'));
  expect(kind(stickersFor({ ...FULL, moves: own }, 'METRIC'), 'pr')!.title).toBe('Box squat');
});

test('PR with no gain to tell (progress unread, or the same load): the set alone', () => {
  expect(kind(stickersFor({ ...FULL, progress: null }, 'METRIC'), 'pr')!.stats).toHaveLength(1);
  const same: Schemas['TrainingProgress'] = { ...PROGRESS, lifts: [lift('squat', 100, 100)] };
  expect(kind(stickersFor({ ...FULL, progress: same }, 'METRIC'), 'pr')!.stats).toHaveLength(1);
});

test('PR of a first session: the baseline set, and that every set has a target from here', () => {
  const first: Ready = { ...END, summary: { ...END.summary, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }] } };
  const pr = kind(stickersFor({ ...FULL, workout: first }, 'METRIC'), 'pr')!;
  expect(pr.kicker).toBe(t('exercises.squat.name'));
  expect(pr.title).toBe(t('workoutEnd.baseline'));
  expect(pr.lines).toEqual([t('workoutEnd.baselineBody')]);
});

test('Streak: weeks on track of the weeks counted, the grid as the server states it, a spare week said', () => {
  const streak = kind(stickersFor(FULL, 'METRIC'), 'streak')!;
  expect(streak.kicker).toBe(t('share.sticker.streak.kicker'));
  expect(streak.title).toBe(t('share.sticker.streak.title', { onTrack: 11, counted: 12 }));
  expect(streak.lines).toEqual([t('share.sticker.streak.spare.one')]);
  expect(streak.weeks).toHaveLength(12);
  expect(streak.weeks[6]).toBe('SPARE');
});

test('Streak with no spare week used says nothing of it; with several, counts them', () => {
  const none = { ...CONSISTENCY, record: { ...CONSISTENCY.record, forgivenWeeks: 0 } };
  expect(kind(stickersFor({ ...FULL, consistency: none }, 'METRIC'), 'streak')!.lines).toEqual([]);
  const two = { ...CONSISTENCY, record: { ...CONSISTENCY.record, forgivenWeeks: 2 } };
  expect(kind(stickersFor({ ...FULL, consistency: two }, 'METRIC'), 'streak')!.lines).toEqual([t('share.sticker.streak.spare.other', { count: 2 })]);
});

test('Progress: the weeks in and the three lifts that gained the most, most first; a lift that did not gain is not named', () => {
  const progress = kind(stickersFor(FULL, 'METRIC'), 'progress')!;
  expect(progress.kicker).toBe(t('share.sticker.progress.kicker'));
  expect(progress.title).toBe(t('share.sticker.progress.inWeeks.other', { count: 12 }));
  expect(progress.lines).toEqual([
    t('share.sticker.progress.lift', { move: t('exercises.squat.name'), load: '20 kg' }),
    t('share.sticker.progress.lift', { move: t('exercises.romanian_deadlift.name'), load: '20 kg' }),
    t('share.sticker.progress.lift', { move: t('exercises.seated_row.name'), load: '10 kg' }),
  ]);
});

test('Progress in the first week and with no weeks counted yet: singular, and "so far"', () => {
  const one = { ...CONSISTENCY, record: { ...CONSISTENCY.record, countedWeeks: 1 } };
  expect(kind(stickersFor({ ...FULL, consistency: one }, 'METRIC'), 'progress')!.title).toBe(t('share.sticker.progress.inWeeks.one'));
  const zero = { ...CONSISTENCY, record: { ...CONSISTENCY.record, countedWeeks: 0 } };
  expect(kind(stickersFor({ ...FULL, consistency: zero }, 'METRIC'), 'progress')!.title).toBe(t('share.sticker.progress.soFar'));
});

test('a sticker with nothing to say is not offered', () => {
  const nothing = stickersFor({ workout: null, consistency: null, progress: null, moves: MOVES }, 'METRIC');
  expect(nothing).toEqual([]);
  const noRecordYet = { ...CONSISTENCY, record: { ...CONSISTENCY.record, countedWeeks: 0, onTrackWeeks: 0, forgivenWeeks: 0 }, weeks: [] };
  const kinds = stickersFor({ ...FULL, consistency: noRecordYet, progress: { ...PROGRESS, lifts: [lift('squat', 100, 100)], strongerLifts: 0 } }, 'METRIC').map((s) => s.kind);
  expect(kinds).toEqual(['workout', 'pr']);
  const noMarks: Ready = { ...END, summary: { ...END.summary, marks: [] } };
  expect(stickersFor({ ...FULL, workout: noMarks }, 'METRIC').map((s) => s.kind)).toEqual(['workout', 'streak', 'progress']);
});

describe('what no sticker says', () => {
  type Rule = { id: string; pattern: string; examples: string[]; nonExamples: string[] };
  const rules = [...(forbidden.rules as Rule[]), ...(shareForbidden.rules as Rule[])];
  const caught = (text: string) => rules.filter((r) => new RegExp(r.pattern, 'i').test(text)).map((r) => r.id);
  // Each pattern of the share list proves itself on its own examples before it is trusted (moved from the share card's tests, K-612).
  test.each((shareForbidden.rules as Rule[]).flatMap((r) => r.examples.map((e) => [r.id, e])))('%s catches "%s"', (_, example) => {
    expect(caught(example)).not.toEqual([]);
  });

  test.each((shareForbidden.rules as Rule[]).flatMap((r) => r.nonExamples.map((e) => [r.id, e])))('%s lets "%s" through', (id, text) => {
    expect(caught(text)).not.toContain(id);
  });

  // The sticker's own list (ADR-076 #2): no body weight, no energy, no body fat, no estimated max.
  const NEVER = /\bbody\s*weight\b|\bweigh(ed)?[\s-]*in\b|\bkcal\b|\bcalor\w*|\bbody[\s-]*fat\b|\bfat\b|\be1rm\b|\b1rm\b|\bestimated\b|\bmax\b/i;
  const all = (facts: StickerFacts) => (['METRIC', 'IMPERIAL'] as const).flatMap((units) => stickersFor(facts, units).flatMap(words));

  test('the list catches what it is for, and lets "kg lifted" through', () => {
    for (const bad of ['Body weight 84 kg', '310 kcal', 'Calories burned', 'Body fat down', 'e1RM 120', 'Estimated max', 'Weighed in']) expect(NEVER.test(bad)).toBe(true);
    for (const good of ['kg lifted', 'lb lifted', 'Squat 100 kg × 8', 'Weeks on track', '1 spare week']) expect(NEVER.test(good)).toBe(false);
  });

  test('every word of every sticker, in both units, passes the lists', () => {
    const texts = all(FULL);
    expect(texts.length).toBeGreaterThan(30);
    expect(texts.filter((text) => NEVER.test(text))).toEqual([]);
    expect(texts.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
    // The Watch's energy is on the end screen, and not on the sticker.
    expect(texts.join(' ')).not.toContain('310');
  });

  test('every text the share screen has, and no dash of the kind the copy rules forbid', () => {
    const values = (tree: object): string[] => Object.values(tree).flatMap((v) => (typeof v === 'string' ? [v] : values(v as object)));
    const share = values((en as { share: object }).share);
    expect(share.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
    expect([...share, ...all(FULL)].filter((text) => /[–—]/.test(text))).toEqual([]);
  });

  test('every call title is not on a sticker: the weekly call is never shared', () => {
    const decisions = (en as { decision: Record<string, Record<string, { title?: string }>> }).decision;
    const titles = Object.values(decisions).flatMap((group) => Object.values(group).flatMap((v) => (typeof v === 'object' && v.title ? [v.title] : [])));
    const texts = all(FULL).join('\n');
    expect(titles.filter((title) => texts.includes(title))).toEqual([]);
  });
});
