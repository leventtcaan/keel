/**
 * The Progress tab (K-604, prototype 4.4): a compound lift's estimated 1RM week by week, the two windows labelled apart
 * (decisions: the last 2 weeks, the shaded band; progress: judged over 90 days, the whole line), every label on the chart
 * a value a week reached. The shape projection's way in (K-606) stays on the tab, and so does the coach.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ProgressScreen from '@/app/(tabs)/progress';
import { t } from '@/copy';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { Loaded } from '@/today/today';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to) },
  useRouter: () => ({ push: (to: unknown) => mockPush(to) }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));

const EXERCISES = [
  { id: 'bench_press', kind: 'COMPOUND', load: 'EXTERNAL', unilateral: false },
  { id: 'squat', kind: 'COMPOUND', load: 'EXTERNAL', unilateral: false },
  { id: 'lateral_raise', kind: 'ISOLATION', load: 'EXTERNAL', unilateral: false },
] as Schemas['Exercise'][];
let n = 0;
const set = (exerciseId: string, loadKg: number, reps: number, rir?: number) => ({
  id: `srv-${(n += 1)}`,
  clientId: `s${n}`,
  exerciseId,
  setType: 'WORKING' as const,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
const workout = (day: string, sets: ReturnType<typeof set>[]): Schemas['Workout'] => ({
  id: `w-${day}`,
  clientId: `c-${day}`,
  startedAt: `${day}T12:00:00Z`,
  endedAt: `${day}T13:00:00Z`,
  sets,
});
// Bench: 96 → 98.7 → 102 → 104 (estimated 1RM: 80 kg for 5 at RIR 1 is 80 × 36/30 = 96). The week of Sep 14 is the same
// weight and reps as the week before with one more in reserve: a ring. Squat has more weeks, so it is the first lift shown.
const WORKOUTS = [
  workout('2026-09-07', [set('bench_press', 80, 5, 1), set('squat', 100, 5, 1), set('lateral_raise', 12, 12, 0)]),
  workout('2026-09-14', [set('bench_press', 80, 5, 2), set('squat', 100, 5, 1)]),
  workout('2026-09-21', [set('bench_press', 85, 5, 1), set('squat', 102.5, 5, 1)]),
  workout('2026-09-30', [set('bench_press', 78, 9, 1), set('squat', 105, 5, 1)]),
  workout('2026-08-24', [set('squat', 95, 5, 1)]),
];

let mockHistory: Loaded<Schemas['Workout'][]>;
let mockRecords: LocalRecord[] = [];
let mockData: TrainData;
const mockServices = {
  api: {},
  training: { read: async () => mockData, own: async () => [], history: jest.fn(async () => mockHistory) },
  workoutRecords: async () => mockRecords,
  report: jest.fn(),
};
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeAll(() => {
  // Only the clock is fixed (a Wednesday); timers and promises run as usual.
  jest.useFakeTimers({
    now: new Date(2026, 9, 7, 12, 0),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockUnits = 'METRIC';
  mockRecords = [];
  mockHistory = { state: 'ready', value: WORKOUTS };
  mockData = { program: { state: 'none' }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <ProgressScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

const chart = () => screen.getByTestId('strength-chart');
type Node = ReturnType<typeof screen.getByTestId>;
/** An SVG text's words: react-native-svg keeps them on its span (`content`), not as a text child. */
const svgText = (el: Node) => el.children.map((child) => (typeof child === 'string' ? child : (child.props.content as string))).join('');

test('the lifts with a line, the most weeks first; an isolation move is not one of them', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('screens.progress.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('strength.title'))).toBeOnTheScreen();
  const chips = screen.getAllByRole('button').filter((b) => b.props.accessibilityState?.selected !== undefined);
  expect(chips.map((c) => within(c).getByText(/./).props.children)).toEqual([t('exercises.squat.name'), t('exercises.bench_press.name')]);
  expect(chips[0].props.accessibilityState.selected).toBe(true);
});

test('a lift: its latest week large, where it started, and a chart whose labels are its lowest and highest week', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  expect(screen.getByTestId('strength-latest')).toHaveTextContent('104 kg');
  expect(screen.getByText(t('strength.since', { load: '96 kg', date: 'Sep 7' }))).toBeOnTheScreen();
  // The labels: the real lowest (96, Sep 7) and highest (104, this week) — not 95 or 105, which no week reached.
  expect(within(chart()).getAllByTestId('strength-tick').map(svgText)).toEqual(['96 kg', '104 kg']);
  expect(chart().props.accessibilityLabel).toBe(
    t('strength.spoken', {
      move: t('exercises.bench_press.name'),
      first: '96 kg',
      firstDate: 'Sep 7',
      last: '104 kg',
      lastDate: 'Sep 28',
      low: '96 kg',
      high: '104 kg',
    }),
  );
});

test('a ring where the same weight went for the same reps with more in reserve', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  expect(within(chart()).getAllByTestId(/^strength-point-/)).toHaveLength(4);
  expect(within(chart()).getAllByTestId(/^strength-easier-/).map((ring) => ring.props.testID)).toEqual(['strength-easier-2026-09-14']);
  expect(screen.getByText(t('strength.legendEasier'))).toBeOnTheScreen();
});

test('the two windows, each labelled: the decision band on the chart and the whole line', async () => {
  await show();
  expect(svgText(within(chart()).getByTestId('strength-band-label'))).toBe(t('strength.band'));
  expect(within(chart()).getByTestId('strength-band')).toBeOnTheScreen();
  expect(screen.getByText(t('strength.callTitle', { weeks: 2 }))).toBeOnTheScreen();
  expect(screen.getByText(t('strength.callNote'))).toBeOnTheScreen();
  expect(screen.getByText(t('strength.judgeTitle', { days: 90 }))).toBeOnTheScreen();
  expect(screen.getByText(t('strength.judgeNote'))).toBeOnTheScreen();
});

test('in pounds, the labels are the pounds of the same weeks', async () => {
  mockUnits = 'IMPERIAL';
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  expect(within(chart()).getAllByTestId('strength-tick').map(svgText)).toEqual(['211.6 lb', '229.3 lb']);
  expect(screen.getByTestId('strength-latest')).toHaveTextContent('229.3 lb');
});

test('nothing to draw yet: a sentence instead of an empty chart, the projection and the coach still there', async () => {
  mockHistory = { state: 'ready', value: [workout('2026-09-30', [set('bench_press', 80, 5), set('lateral_raise', 12, 12, 0)])] };
  await show();
  expect(screen.getByText(t('strength.empty'))).toBeOnTheScreen();
  expect(screen.queryByTestId('strength-chart')).toBeNull();
  expect(screen.getByRole('button', { name: t('projection.view.title') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('coach.entry') })).toBeOnTheScreen();
});

test('the projection way in stays on the tab and opens the projection (K-606)', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('projection.view.title') }));
  expect(mockPush).toHaveBeenCalledWith('/projection');
});

test('the server not reachable: what is on this phone, said so', async () => {
  mockHistory = { state: 'failed', problem: 'NoConnection' };
  const finished = { kind: 'workout', clientId: 'local', seq: 1, state: 'PENDING', body: { clientId: 'local', startedAt: '2026-09-30T12:00:00Z' } };
  const local = { kind: 'set', clientId: 'ls', parentClientId: 'local', seq: 2, state: 'PENDING', body: set('bench_press', 80, 5, 1) };
  mockRecords = [finished, local] as unknown as LocalRecord[];
  await show();
  expect(screen.getByText(t('history.phoneOnly'))).toBeOnTheScreen();
  expect(screen.getByTestId('strength-latest')).toHaveTextContent('96 kg');
});

test('a read that fails is reported, not shown as a crash', async () => {
  mockServices.training.history.mockRejectedValueOnce(new TypeError('x'));
  await show();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'TypeError' });
});
