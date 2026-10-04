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
let mockFocus: (() => void) | null = null;
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to) },
  useRouter: () => ({ push: (to: unknown) => mockPush(to) }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    mockFocus = effect;
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
// Noon on the phone's own clock: that calendar day in any time zone.
const localNoon = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
};
const workout = (day: string, sets: ReturnType<typeof set>[]): Schemas['Workout'] => ({
  id: `w-${day}`,
  clientId: `c-${day}`,
  startedAt: localNoon(day),
  endedAt: localNoon(day),
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
// The first eight weeks' week (K-614: the first photo is due in week 4); the strength reads go through the training cache.
let mockFirstWeeks: { status: number; week?: number; code?: string; offline?: boolean } = { status: 404 };
/** Every call to the API client, whatever its method: the tab asks for the week, never anything about a photo. */
const mockApiCalls: string[] = [];
const mockApi = new Proxy(
  {},
  {
    get: (_target, method: string) => async (path: string) => {
      mockApiCalls.push(`${method} ${path}`);
      const { status, week, code, offline } = mockFirstWeeks;
      if (offline) throw new TypeError('Network request failed');
      return week === undefined
        ? { error: { code: code ?? 'NOT_FOUND', message: 'x' }, response: new Response(null, { status }) }
        : { data: { week, risk: [], readsRisk: false, training: true }, response: new Response(null, { status }) };
    },
  },
);
let mockPhotoChecks: { takenOn: string; photos: { front?: string } }[] = [];
const mockServices = {
  api: mockApi,
  photos: { checks: jest.fn(async () => mockPhotoChecks), forget: jest.fn(async () => {}) },
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
  mockFirstWeeks = { status: 404 };
  mockApiCalls.length = 0;
  mockPhotoChecks = [];
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
    `${t('strength.spoken', {
      move: t('exercises.bench_press.name'),
      first: '96 kg',
      firstDate: 'Sep 7',
      last: '104 kg',
      lastDate: 'Sep 28',
      low: '96 kg',
      high: '104 kg',
    })} ${t('strength.spokenEasier', { weeks: 'Sep 14' })}`,
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
  const finished = { kind: 'workout', clientId: 'local', seq: 1, state: 'PENDING', body: { clientId: 'local', startedAt: localNoon('2026-09-30') } };
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

const at = (week: string) => within(chart()).getByTestId(`strength-point-${week}`).props as { cx: number; cy: number };
const tickYs = () => within(chart()).getAllByTestId('strength-tick').map((tick) => (tick.props.y as number[])[0]);

test.each(['METRIC', 'IMPERIAL'] as const)('in %s the points are drawn on the labels scale, week after week, the band over the last two', async (units) => {
  mockUnits = units;
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  const [low, high] = [at('2026-09-07'), at('2026-09-28')]; // 96 and 104
  const [lowTick, highTick] = tickYs();
  // Each label sits the same distance from the point it names: on the same scale, in either unit.
  expect(lowTick - low.cy).toBeCloseTo(highTick - high.cy, 6);
  expect(high.cy).toBeLessThan(low.cy);
  const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
  const xs = weeks.map((week) => at(week).cx);
  for (let i = 1; i < xs.length; i += 1) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  const band = within(chart()).getByTestId('strength-band').props.x as number;
  expect(band).toBeGreaterThan(at('2026-09-21').cx);
  expect(band).toBeLessThan(at('2026-09-28').cx);
  // The line runs through the very same points.
  const line = within(chart()).getByTestId('strength-line').props.d as string;
  expect(line).toBe(`M${weeks.map((week) => `${at(week).cx} ${at(week).cy}`).join(' ')}`);
});

test('the dates under the chart: the line first Monday, inside the 90 days, and this week', async () => {
  await show();
  expect(svgText(within(chart()).getByTestId('strength-from'))).toBe('Jul 13');
  expect(svgText(within(chart()).getByTestId('strength-to'))).toBe('Oct 5');
});

test('in pounds, two weights that read as one are the same weight: a ring', async () => {
  mockUnits = 'IMPERIAL';
  mockHistory = {
    state: 'ready',
    value: [workout('2026-09-21', [set('bench_press', 62.5, 8, 0)]), workout('2026-09-28', [set('bench_press', 62.51, 8, 1)])],
  };
  await show();
  expect(within(chart()).getAllByTestId(/^strength-easier-/).map((ring) => ring.props.testID)).toEqual(['strength-easier-2026-09-28']);
});

test('no ring, no word about rings: neither in the legend nor in what VoiceOver says', async () => {
  mockHistory = { state: 'ready', value: [workout('2026-09-21', [set('bench_press', 80, 5, 1)]), workout('2026-09-28', [set('bench_press', 85, 5, 1)])] };
  await show();
  expect(screen.queryByText(t('strength.legendEasier'))).toBeNull();
  expect(chart().props.accessibilityLabel).not.toContain(t('strength.spokenEasier', { weeks: '' }).trim());
});

test('one lift: no chips to pick from', async () => {
  mockHistory = { state: 'ready', value: [workout('2026-09-28', [set('bench_press', 80, 5, 1)])] };
  await show();
  expect(screen.queryByRole('button', { name: t('exercises.bench_press.name') })).toBeNull();
  expect(screen.getByTestId('strength-latest')).toHaveTextContent('96 kg');
});

test('nothing to draw: the windows are not explained either', async () => {
  mockHistory = { state: 'ready', value: [] };
  await show();
  expect(screen.queryByText(t('strength.callNote'))).toBeNull();
  expect(screen.queryByText(t('strength.judgeNote'))).toBeNull();
});

test('the server answered: no "on this phone" note', async () => {
  await show();
  expect(screen.queryByText(t('history.phoneOnly'))).toBeNull();
});

test('the catalog never read on this phone: said so, not "log a lift"', async () => {
  mockData = { program: { state: 'none' }, exercises: { state: 'failed', problem: 'NoConnection' }, kept: false };
  await show();
  expect(screen.getByText(t('strength.loadFailed'))).toBeOnTheScreen();
  expect(screen.queryByText(t('strength.empty'))).toBeNull();
});

test('a picked lift gone from the next read: the first lift shown, no crash', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  mockHistory = { state: 'ready', value: [workout('2026-09-28', [set('squat', 100, 5, 1)])] };
  await act(async () => mockFocus?.());
  expect(screen.getByTestId('strength-latest')).toHaveTextContent('120 kg');
});

describe('photos (K-614)', () => {
  test('the photos card, with the first photo due in week 4 while the first weeks run', async () => {
    mockFirstWeeks = { status: 200, week: 2 };
    await show();
    expect(screen.getByTestId('photo-card')).toBeOnTheScreen();
    expect(screen.getByText(t('photos.first', { week: 4 }))).toBeOnTheScreen();
  });

  test('the first weeks over (404): the first photo is due', async () => {
    await show();
    expect(screen.getByText(t('photos.firstDue'))).toBeOnTheScreen();
  });

  test('no health consent: the week is unknown, the photo offered without being called due', async () => {
    mockFirstWeeks = { status: 403, code: 'CONSENT_REQUIRED' };
    await show();
    expect(screen.getByText(t('photos.anytime'))).toBeOnTheScreen();
  });

  test('the only thing the tab asks the server for itself is the week; nothing about a photo', async () => {
    mockPhotoChecks = [{ takenOn: '2026-09-20', photos: { front: 'file:///docs/2026-09-20-front.jpg' } }];
    await show();
    expect(mockApiCalls).toEqual(['GET /v1/first-weeks']);
  });

  test('week 4 of the first weeks: the first photo is due', async () => {
    mockFirstWeeks = { status: 200, week: 4 };
    await show();
    expect(screen.getByText(t('photos.firstDue'))).toBeOnTheScreen();
  });

  test('offline: the week is unknown, not over', async () => {
    mockFirstWeeks = { status: 0, offline: true };
    await show();
    expect(screen.getByText(t('photos.anytime'))).toBeOnTheScreen();
  });

  test('with photos, the window counts from the last one to today: open since four weeks after it', async () => {
    mockPhotoChecks = [{ takenOn: '2026-08-01', photos: { front: 'file:///docs/2026-08-01-front.jpg' } }];
    await show();
    expect(screen.getByText(t('photos.open', { date: 'Aug 29' }))).toBeOnTheScreen();
  });
});
