/**
 * The workout's end (K-974, ADR-075 #7; prototype `#summary`), always dark: "Workout complete" (still under Reduce
 * Motion), the server's minutes, kg lifted (+% against the same day last time), working sets, and the Apple Watch's
 * kcal only when measured, else three boxes in one row; the record card with its next target, or the baseline; the
 * muscle map; this week's sessions as segments; Share and Done. No e1RM, no badge. Not on the server yet: the hero and
 * a way to try again, no number made up.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import WorkoutEndScreen from '@/app/workout-end';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { focusPalette } from '@/theme/tokens';
import type { Move } from '@/train/trainData';
import type { WorkoutEnd } from '@/train/workoutEnd';

type Schemas = components['schemas'];

const DAY: Schemas['ProgramDay'] = {
  id: 'a',
  nameKey: 'programDays.full_body_a.name',
  weekday: 'TUESDAY',
  exercises: [{ exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 100, nextReps: 9 }],
};
const PROGRAM: Schemas['Program'] = { id: 'p', source: 'GENERATED', days: [DAY], week: [] };
const MUSCLES: Schemas['MuscleSets'][] = [{ muscle: 'quads', plannedSets: 10, doneSets: 6, targetSets: 10, plannedShare: 1, doneShare: 0.6 }];
const SUMMARY: Schemas['WorkoutSummary'] = {
  workoutId: 'srv',
  minutes: 52,
  liftedKg: 4200,
  liftedChangePercent: 6,
  workingSets: 15,
  // In the server's order (first done): the card shows the first record, never one the phone picks.
  marks: [
    { exerciseId: 'squat', kind: 'RECORD', loadKg: 100, reps: 8 },
    { exerciseId: 'bench_press', kind: 'RECORD', loadKg: 120, reps: 3 },
  ],
  // The "what moved" card shows only when moves are listed; the tests of it give their own.
  moves: [],
  weekOf: '2026-09-28',
  muscles: MUSCLES,
};
const READY: WorkoutEnd = { kind: 'ready', summary: SUMMARY, program: PROGRAM, programDayId: 'a', week: { done: 2, planned: 3 }, kcal: 340, moves: new Map() };
// The user's own move: not in the catalog, so its name is only in what the end read.
const OWN = new Map([['custom-1', { id: 'custom-1', name: 'Zercher squat' } as Move]]);

let mockEnd: WorkoutEnd = READY;
const mockLoad = jest.fn(async () => mockEnd);
jest.mock('@/train/workoutEnd', () => ({ loadWorkoutEnd: () => mockLoad() }));
const mockHaptic = jest.fn();
jest.mock('@/train/haptics', () => ({ haptics: { record: () => mockHaptic() } }));
let mockReduce = false;
jest.mock('@/theme/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));
const mockMap = jest.fn((_props: unknown) => null);
jest.mock('@/components/MuscleMap', () => ({ MuscleMap: (props: unknown) => mockMap(props) }));
const mockServices = { bodyFigure: async () => 'female' };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
const mockPush = jest.fn();
const mockDismiss = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), dismissTo: (...a: unknown[]) => mockDismiss(...a) },
  useLocalSearchParams: () => ({ workout: 'w1' }),
  useFocusEffect: (effect: () => () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));
const mockBar = jest.fn();
jest.mock('expo-status-bar', () => ({ StatusBar: () => null, setStatusBarStyle: (style: string) => mockBar(style) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockEnd = READY;
  mockReduce = false;
});

const show = () =>
  render(
    <ThemeProvider>
      <WorkoutEndScreen />
    </ThemeProvider>,
  );

test("the hero, the day's name, and the server's numbers: minutes, kg lifted with its change, sets, the watch's kcal", async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.title'))).toBeTruthy();
  expect(screen.getByText('Full body A')).toBeTruthy();
  expect(screen.getByText('52')).toBeTruthy();
  expect(screen.getByText('4,200')).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.change', { percent: '+6' }))).toBeTruthy();
  expect(screen.getByText('15')).toBeTruthy();
  expect(screen.getByText('340')).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.watch'))).toBeTruthy();
  // Four boxes with the watch's kcal; each said as one to VoiceOver.
  expect(screen.getAllByTestId('stat')).toHaveLength(4);
  expect(screen.getByLabelText(`340 ${t('workoutEnd.kcal')} ${t('workoutEnd.watch')}`)).toBeTruthy();
});

test('no watch reading: no kcal box, the other three in one row', async () => {
  mockEnd = { ...READY, kcal: undefined };
  await show();
  expect(await screen.findByText('52')).toBeTruthy();
  expect(screen.queryByText(t('workoutEnd.watch'))).toBeNull();
  expect(screen.getAllByTestId('stat')).toHaveLength(3);
});

test('closed by itself (no minutes known): no minutes box, none made up', async () => {
  mockEnd = { ...READY, kcal: undefined, summary: { ...SUMMARY, minutes: undefined } };
  await show();
  expect(await screen.findByText('4,200')).toBeTruthy();
  expect(screen.getAllByTestId('stat')).toHaveLength(2);
  expect(screen.queryByText(t('workoutEnd.minutes.other'))).toBeNull();
});

// K1 (Evre 7 C3): the card named only the first record ("Record", "Best ever. Next: ..."); a finish is an achievement, so every record of the session is
// named, each the real set, in the server's order, under "New best".
test("every record of the session: 'New best', the real sets in the server's order, and the next target from the program where it has one", async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.recordKicker'))).toBeTruthy();
  expect(screen.getAllByTestId('record')).toHaveLength(2);
  expect(screen.getByText(t('workoutEnd.record', { move: 'Squat', set: '100 kg × 8' }))).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.record', { move: 'Bench press', set: '120 kg × 3' }))).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.recordNext', { set: '100 kg × 9' }))).toBeTruthy();
  expect(screen.queryByText(/e1RM|estimated/i)).toBeNull();
});

test('a record: the haptic once (ADR-075 #7, Ek 5); none without a record', async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.title'))).toBeTruthy();
  expect(mockHaptic).toHaveBeenCalledTimes(1);
});

test('no record (a baseline only): no haptic', async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }] } };
  await show();
  expect(await screen.findByText(t('workoutEnd.baseline'))).toBeTruthy();
  expect(mockHaptic).not.toHaveBeenCalled();
});

test("the first session: Baseline set, and what it's for", async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, liftedChangePercent: undefined, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }] } };
  await show();
  expect(await screen.findByText(t('workoutEnd.baseline'))).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.baselineBody'))).toBeTruthy();
  expect(screen.queryByText(t('workoutEnd.change', { percent: '+6' }))).toBeNull();
});

test('a worse session than the last is never shown as a negative percent: the weight lifted stands alone (U7, Evre 7 C3)', async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, liftedChangePercent: -94 } };
  await show();
  expect(await screen.findByText(t('workoutEnd.week', { done: 2, planned: 3 }))).toBeTruthy();
  expect(screen.queryByText(/vs last time/)).toBeNull();
  expect(screen.queryByText(/-94/)).toBeNull();
});

test('a session the server could not compare with the last one (K-1014) shows the weight lifted and no percent', async () => {
  // The server leaves liftedChangePercent out for a half session against a whole one; the phone does not make one up, not even 0.
  mockEnd = { ...READY, summary: { ...SUMMARY, liftedChangePercent: undefined } };
  await show();
  expect(await screen.findByText(t('workoutEnd.week', { done: 2, planned: 3 }))).toBeTruthy();
  expect(screen.queryByText(/vs last time/)).toBeNull();
});

test("the muscle map from the server's muscles, in the user's figure; this week as segments", async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.week', { done: 2, planned: 3 }))).toBeTruthy();
  expect(screen.getAllByTestId('segment')).toHaveLength(3);
  expect(screen.getAllByTestId('segment-done')).toHaveLength(2);
  expect(mockMap).toHaveBeenLastCalledWith({ muscles: MUSCLES, figure: 'female' });
});

test('Share opens the stickers of this workout; Done goes back to the tabs', async () => {
  await show();
  await fireEvent.press(await screen.findByText(t('workoutEnd.share')));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/share', params: { workout: 'w1' } });
  await fireEvent.press(screen.getByText(t('workoutEnd.done')));
  expect(mockDismiss).toHaveBeenCalledWith('/train');
});

test('not on the server yet: the hero, why the numbers wait, and a way to try again', async () => {
  mockEnd = { kind: 'pending' };
  await show();
  expect(await screen.findByText(t('workoutEnd.pending'))).toBeTruthy();
  expect(screen.queryByTestId('stats')).toBeNull();
  mockEnd = READY;
  await fireEvent.press(screen.getByText(t('workoutEnd.retry')));
  expect(await screen.findByText('4,200')).toBeTruthy();
});

test('Reduce Motion: the hero is still, nothing animates', async () => {
  mockReduce = true;
  await show();
  expect(await screen.findByTestId('hero-mark')).toHaveStyle({ opacity: 1, transform: [{ scale: 1 }] });
  await act(async () => undefined);
});

test("the record's move not on the program's day (or the program not read): the set alone, no next target made up", async () => {
  mockEnd = { ...READY, program: null };
  await show();
  expect(await screen.findByText(t('workoutEnd.record', { move: 'Squat', set: '100 kg × 8' }))).toBeTruthy();
  expect(screen.queryByText(/^Next:/)).toBeNull();
});

test('the status bar is light while this screen is in front, and back to dark once it leaves (the share card is light)', async () => {
  const { unmount } = await show();
  expect(await screen.findByText(t('workoutEnd.title'))).toBeTruthy();
  expect(mockBar).toHaveBeenLastCalledWith('light');
  await unmount();
  expect(mockBar).toHaveBeenLastCalledWith('auto');
});

test('the summary not read: said, and Try again reads once however often it is tapped', async () => {
  let answer: (v: WorkoutEnd) => void = () => undefined;
  mockLoad.mockImplementationOnce(async () => ({ kind: 'failed', problem: 'NoConnection' }));
  await show();
  expect(await screen.findByText(t('workoutEnd.failed'))).toBeTruthy();
  mockLoad.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
  const retry = screen.getByText(t('workoutEnd.retry'));
  await fireEvent.press(retry);
  await fireEvent.press(retry);
  expect(mockLoad).toHaveBeenCalledTimes(2);
  await act(async () => answer(READY));
  expect(await screen.findByText('4,200')).toBeTruthy();
});

test('a read that throws is failed, not a blank screen', async () => {
  mockLoad.mockImplementationOnce(async () => {
    throw new Error('store');
  });
  await show();
  expect(await screen.findByText(t('workoutEnd.failed'))).toBeTruthy();
});

test('pending, failed and ready are said to VoiceOver as they come', async () => {
  const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  mockEnd = { kind: 'pending' };
  await show();
  expect(await screen.findByText(t('workoutEnd.pending'))).toBeTruthy();
  expect(said).toHaveBeenCalledWith(t('workoutEnd.pending'));
  mockEnd = READY;
  await fireEvent.press(screen.getByText(t('workoutEnd.retry')));
  expect(await screen.findByText('4,200')).toBeTruthy();
  expect(said).toHaveBeenCalledWith(t('workoutEnd.ready'));
});

const MOVES: Schemas['MoveChange'][] = [
  { exerciseId: 'romanian_deadlift', best: { loadKg: 90, reps: 9 }, change: 'REPS', by: 1 },
  { exerciseId: 'seated_row', best: { loadKg: 55, reps: 9 }, change: 'LOAD', by: -5 },
  { exerciseId: 'bench_press', best: { loadKg: 72.5, reps: 8 }, change: 'HELD' },
];

test('what moved: a row per move from the catalog, the set and what improved; a lighter day is not said (U7)', async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, moves: MOVES } };
  await show();
  expect(await screen.findByText(t('workoutEnd.moved'))).toBeTruthy();
  expect(screen.getAllByTestId('moved-row')).toHaveLength(3);
  expect(screen.getByText('Romanian deadlift')).toBeTruthy();
  expect(screen.getByText('90 × 9')).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.move.repsUp.one', { count: 1 }))).toBeTruthy();
  expect(screen.queryByText(/lighter|fewer/)).toBeNull(); // a lighter day is not said (U7)
  expect(screen.getByText(t('workoutEnd.move.held'))).toBeTruthy();
  // Each row is said as one line to VoiceOver, with the unit.
  const spoken = t('workoutEnd.move.labelPlain', { move: 'Seated row', set: '55 kg × 9' });
  expect(screen.getByLabelText(spoken)).toBeTruthy();
  expect(screen.queryByText(/e1RM|estimated/i)).toBeNull();
});

test("what moved: the user's own move (not in the catalog) is named in the row and to VoiceOver, never by its id", async () => {
  const own: Schemas['MoveChange'] = { exerciseId: 'custom-1', best: { loadKg: 80, reps: 6 }, change: 'LOAD', by: 5 };
  mockEnd = { ...READY, summary: { ...SUMMARY, moves: [own] }, moves: OWN };
  await show();
  expect(await screen.findByText('Zercher squat')).toBeTruthy();
  expect(screen.queryByText('custom-1')).toBeNull();
  const spoken = t('workoutEnd.move.label', { move: 'Zercher squat', set: '80 kg × 6', change: t('workoutEnd.move.loadUp', { amount: '5 kg' }) });
  expect(screen.getByLabelText(spoken)).toBeTruthy();
});

test("a record on the user's own move names it as they called it", async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, marks: [{ exerciseId: 'custom-1', kind: 'RECORD', loadKg: 80, reps: 6 }] }, moves: OWN };
  await show();
  expect(await screen.findByText(t('workoutEnd.record', { move: 'Zercher squat', set: '80 kg × 6' }))).toBeTruthy();
  expect(screen.queryByText(/custom-1/)).toBeNull();
});

test('what moved: a long list shows the first few and how many more', async () => {
  const many: Schemas['MoveChange'][] = Array.from({ length: 5 }, (_, i) => ({ exerciseId: 'squat', best: { loadKg: 100 + i, reps: 8 }, change: 'SAME' }));
  mockEnd = { ...READY, summary: { ...SUMMARY, moves: many } };
  await show();
  expect(await screen.findByText(t('workoutEnd.moved'))).toBeTruthy();
  expect(screen.getAllByTestId('moved-row')).toHaveLength(3);
  expect(screen.getByText(t('workoutEnd.move.more', { count: 2 }))).toBeTruthy();
});

test('what moved: the first session (every move first time) has no list, only the baseline', async () => {
  const first: Schemas['MoveChange'] = { exerciseId: 'squat', best: { loadKg: 60, reps: 8 }, change: 'FIRST' };
  mockEnd = { ...READY, summary: { ...SUMMARY, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }], moves: [first] } };
  await show();
  expect(await screen.findByText(t('workoutEnd.baseline'))).toBeTruthy();
  expect(screen.queryByText(t('workoutEnd.moved'))).toBeNull();
  expect(screen.queryAllByTestId('moved-row')).toHaveLength(0);
});

test('what moved: no moves, no card', async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.title'))).toBeTruthy();
  expect(screen.queryByText(t('workoutEnd.moved'))).toBeNull();
});

describe('Apple Health at the end of the first workout (K-980, ADR-018 Ek 1, prototype #health-jit)', () => {
  const kept = new Map<string, string>();
  const requestRead = jest.fn(async () => {});
  const original = { ...mockServices };

  function arrange(over: { available?: boolean; asked?: boolean } = {}) {
    kept.clear();
    if (over.asked === true) kept.set('health.asked', '1');
    Object.assign(mockServices, {
      api: { PUT: jest.fn(async () => ({ data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) })) },
      health: { available: over.available ?? true, requestRead },
      consents: { granted: async (kind: string) => kind === 'HEALTH_DATA', remember: jest.fn(async () => {}) },
      healthAsk: {
        asked: async () => kept.has('health.asked'),
        markAsked: async () => void kept.set('health.asked', '1'),
        forget: async () => void kept.delete('health.asked'),
      },
      report: jest.fn(),
    });
  }
  afterEach(() => {
    for (const key of Object.keys(mockServices)) if (!(key in original)) delete (mockServices as Record<string, unknown>)[key];
  });

  test('asked under the numbers the first time; Not now ends it for good', async () => {
    arrange();
    await show();
    expect(await screen.findByRole('header', { name: t('health.jit.title') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('health.jit.notNow') }));
    await act(async () => {});
    expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
    expect(kept.get('health.asked')).toBe('1');
    expect(requestRead).not.toHaveBeenCalled();
  });

  // Evre 7 C3 (the walk: the card with "What we read" came in the middle of the celebration): a quiet row after Done, no sentences about what is read.
  test('a quiet row after Done: the title and the two buttons, without the sentences of what is read and written', async () => {
    arrange();
    await show();
    await screen.findByRole('header', { name: t('health.jit.title') });
    expect(screen.queryByText(t('health.jit.reads'))).toBeNull();
    expect(screen.queryByText(t('health.jit.writes'))).toBeNull();
    const text = JSON.stringify(screen.toJSON());
    expect(text.indexOf(t('workoutEnd.done'))).toBeLessThan(text.indexOf(t('health.jit.title')));
  });

  test('Continue shows Apple\'s sheet', async () => {
    arrange();
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('health.jit.continue') }));
    await act(async () => {});
    expect(requestRead).toHaveBeenCalled();
  });

  test.each([
    ['asked at the first weigh-in already', { asked: true }],
    ['Apple Health cannot be asked on this build', { available: false }],
  ])('not asked again: %s', async (_, over) => {
    arrange(over);
    await show();
    expect(await screen.findByText(t('workoutEnd.title'))).toBeTruthy();
    expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
  });
});

// K-1047 (ADR-070 Ek 2 #1): the screen has one primary, Done; Share is the alternative beside it.
describe('one primary (ADR-070 Ek 2 #1)', () => {
  const fill = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style)?.backgroundColor;
  const primaries = () => screen.getAllByRole('button').filter((b) => StyleSheet.flatten(b.props.style)?.backgroundColor === focusPalette.cta);

  test('Done is the only primary, in the turquoise of the focus mode; Share your workout is a secondary', async () => {
    await show();
    await screen.findByText(t('workoutEnd.title'));
    expect(primaries().map((b) => b.props.accessibilityLabel)).toEqual([t('workoutEnd.done')]);
    expect(fill(t('workoutEnd.share'))).toBe(focusPalette.surface);
    expect(fill(t('workoutEnd.done'))).toBe(focusPalette.cta);
    expect(focusPalette.cta).toBe(focusPalette.accent);
  });

  test('Done comes last, under Share', async () => {
    await show();
    await screen.findByText(t('workoutEnd.title'));
    const names = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(names.indexOf(t('workoutEnd.share'))).toBeGreaterThanOrEqual(0);
    expect(names.indexOf(t('workoutEnd.done'))).toBeGreaterThan(names.indexOf(t('workoutEnd.share')));
  });

  test('not on the server yet: Try again is a secondary, and Done is still the one primary', async () => {
    mockEnd = { kind: 'pending' } as WorkoutEnd;
    await show();
    expect(await screen.findByText(t('workoutEnd.retry'))).toBeOnTheScreen();
    expect(fill(t('workoutEnd.retry'))).toBe(focusPalette.surface);
    expect(primaries().map((b) => b.props.accessibilityLabel)).toEqual([t('workoutEnd.done')]);
  });
});
