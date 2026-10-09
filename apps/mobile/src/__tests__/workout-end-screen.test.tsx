/**
 * The workout's end (K-974, ADR-075 #7; prototype `#summary`), always dark: "Workout complete" (still under Reduce
 * Motion), the server's minutes, kg lifted (+% against the same day last time), working sets, and the Apple Watch's
 * kcal only when measured, else three boxes in one row; the record card with its next target, or the baseline; the
 * muscle map; this week's sessions as segments; Share and Done. No e1RM, no badge. Not on the server yet: the hero and
 * a way to try again, no number made up.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WorkoutEndScreen from '@/app/workout-end';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
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
  marks: [
    { exerciseId: 'bench_press', kind: 'RECORD', loadKg: 72.5, reps: 8 },
    { exerciseId: 'squat', kind: 'RECORD', loadKg: 100, reps: 8 },
  ],
  weekOf: '2026-09-28',
  muscles: MUSCLES,
};
const READY: WorkoutEnd = { kind: 'ready', summary: SUMMARY, program: PROGRAM, programDayId: 'a', week: { done: 2, planned: 3 }, kcal: 340 };

let mockEnd: WorkoutEnd = READY;
const mockLoad = jest.fn(async () => mockEnd);
jest.mock('@/train/workoutEnd', () => ({ loadWorkoutEnd: () => mockLoad() }));
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
}));

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
  expect(screen.getByTestId('stats')).toHaveProp('accessibilityHint', undefined);
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

test('a record: the heaviest, the real set, and its next target from the program', async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.record', { move: 'Squat', set: '100 kg × 8' }))).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.recordNext', { set: '100 kg × 9' }))).toBeTruthy();
  expect(screen.queryByText(/e1RM|estimated/i)).toBeNull();
});

test("the first session: Baseline set, and what it's for", async () => {
  mockEnd = { ...READY, summary: { ...SUMMARY, liftedChangePercent: undefined, marks: [{ exerciseId: 'squat', kind: 'BASELINE', loadKg: 60, reps: 8 }] } };
  await show();
  expect(await screen.findByText(t('workoutEnd.baseline'))).toBeTruthy();
  expect(screen.getByText(t('workoutEnd.baselineBody'))).toBeTruthy();
  expect(screen.queryByText(t('workoutEnd.change', { percent: '+6' }))).toBeNull();
});

test("the muscle map from the server's muscles, in the user's figure; this week as segments", async () => {
  await show();
  expect(await screen.findByText(t('workoutEnd.week', { done: 2, planned: 3 }))).toBeTruthy();
  expect(screen.getAllByTestId('segment')).toHaveLength(3);
  expect(screen.getAllByTestId('segment-done')).toHaveLength(2);
  expect(mockMap).toHaveBeenLastCalledWith({ muscles: MUSCLES, figure: 'female' });
});

test('Share opens the share card; Done goes back to the tabs', async () => {
  await show();
  await fireEvent.press(await screen.findByText(t('workoutEnd.share')));
  expect(mockPush).toHaveBeenCalledWith('/share');
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
