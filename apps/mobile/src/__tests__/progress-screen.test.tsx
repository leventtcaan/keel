/**
 * The Progress tab (K-979, ADR-078 + Ek 1 + Ek 2, prototype `#progress`): the first days are four tappable targets, this
 * week's planned muscles, a locked strength and the weigh-ins toward the trend; after the first call, one sentence of results
 * and the 12 weeks. Each part opens when its own data comes (first workout, 7 weigh-ins, first call); no chart is drawn
 * empty. Every number is the server's; the screen counts nothing.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import ProgressScreen from '@/app/(tabs)/progress';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

import { budget, consistency, decision, decisionPage, lift, liftWeeks, muscle, program, starting, summary, trendPoints, training, weeks } from './support/progressFixtures';

const mockPush = jest.fn();
const mockFocusEffects = new Set<() => void>();
const mockFocus = () => mockFocusEffects.forEach((effect) => effect());
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to) },
  useRouter: () => ({ push: (to: unknown) => mockPush(to) }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      mockFocusEffects.add(effect);
      effect();
      return () => void mockFocusEffects.delete(effect);
    }, [effect]);
  },
}));
const mockMap = jest.fn((_props: unknown) => null);
jest.mock('@/components/MuscleMap', () => ({ MuscleMap: (props: unknown) => mockMap(props) }));

/** What each endpoint answers: data, or a status with an error code. */
type Answer = { data: unknown } | { status: number; code?: string } | 'offline';
let answers: Record<string, Answer>;
const mockApiCalls: string[] = [];
const mockCallsAtDrain: number[] = [];
/** The query each path was last asked with. */
const mockQueries: Record<string, unknown> = {};
const mockApi = new Proxy(
  {},
  {
    get: (_target, method: string) => async (path: string, options?: { params?: { path?: { day?: string }; query?: unknown } }) => {
      mockQueries[path] = options?.params?.query;
      mockApiCalls.push(`${method} ${path}${options?.params?.path?.day === undefined ? '' : ` ${options.params.path.day}`}`);
      const answer = answers[path] ?? { status: 404, code: 'NOT_FOUND' };
      if (answer === 'offline') throw new TypeError('Network request failed');
      if ('data' in answer) return { data: answer.data, response: new Response(null, { status: 200 }) };
      return { error: { code: answer.code ?? 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: answer.status }) };
    },
  },
);
const mockSyncHealth = jest.fn(async () => ({ weighIns: 0, stepsToday: 3240 as number | null }));
let mockPhotoChecks: { takenOn: string; photos: { front?: string } }[] = [];
/** The catalog the training service reads: empty unless a test needs a move's load model. */
let mockExercises: unknown[] = [];
const mockServices = {
  api: mockApi,
  photos: { checks: jest.fn(async () => mockPhotoChecks), forget: jest.fn(async () => {}) },
  training: {
    read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: mockExercises }, kept: false }),
    own: async () => [],
  },
  syncHealth: () => mockSyncHealth(),
  bodyFigure: async () => 'female',
  // What waits on the phone is sent before the server is asked (K-1051): how many calls were made when it was sent.
  queue: { drain: jest.fn(async () => void mockCallsAtDrain.push(mockApiCalls.length)) },
  report: jest.fn(),
};
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 15, 12, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

const ok = (data: unknown): Answer => ({ data });
/** The first days: no first call yet, 3 weigh-ins, nothing trained, the plan's starting numbers. */
const firstDay = (): Record<string, Answer> => ({
  '/v1/training-progress': ok(training(0, 0, [muscle('quads', 10, 0), muscle('chest', 8, 0)])),
  '/v1/weigh-ins/summary': ok(summary(3)),
  '/v1/days/{day}/budget': ok(budget()),
  '/v1/program': ok(program({})),
  '/v1/targets/starting': ok(starting()),
});
/** The 12th week: the first call long made, a record, the 12 weeks, a weight change, the trend ready. */
const weekTwelve = (): Record<string, Answer> => ({
  '/v1/training-progress': ok(training(4, 5, [muscle('quads', 10, 6)])),
  '/v1/consistency': ok(
    consistency({
      weeks: weeks(['ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'SPARE', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'MISSED', 'PAUSED', 'ON_TRACK', 'ON_TRACK']),
      weightChange: { kg: -3.8, direction: 'DOWN', since: '2026-07-20' },
    }),
  ),
  '/v1/weigh-ins/summary': ok(summary(80, true)),
  '/v1/days/{day}/budget': ok(budget()),
  '/v1/program': ok(program({ doneThisWeek: 1 })),
  '/v1/weight-trend': ok(trendPoints([84.1, 83.6, 83.1, 82.5, 81.9, 81.2, 80.2])),
  '/v1/decisions': ok(decisionPage([decision('c2', '2026-10-12'), decision('c1', '2026-10-05', { application: { state: 'DECLINED' } })])),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUnits = 'METRIC';
  mockApiCalls.length = 0;
  mockPhotoChecks = [];
  mockExercises = [];
  mockSyncHealth.mockResolvedValue({ weighIns: 0, stepsToday: 3240 });
  answers = firstDay();
});

async function show(scheme: 'light' | 'dark' = 'light') {
  await render(
    <ThemeProvider scheme={scheme}>
      <ProgressScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const box = (kind: string) => screen.getByTestId(`target-${kind}`);
type Node = ReturnType<typeof screen.getByTestId>;
/** Every word under an element, in order, nested texts included. */
const words = (el: Node): string => el.children.map((child) => (typeof child === 'string' ? child : words(child))).join(' ');

// K-1051: a meal logged from this tab's "+" waits in the queue; the read sends it first, so the day it reads counts it.
test('what waits on the phone is sent before the server is asked', async () => {
  mockCallsAtDrain.length = 0;
  await show();
  expect(mockCallsAtDrain).toEqual([0]);
  expect(mockApiCalls.length).toBeGreaterThan(0);
});

describe('the first days (ADR-078 #1)', () => {
  test("the title, today's targets and how to use them", async () => {
    await show();
    expect(screen.getByRole('header', { name: t('screens.progress.title') })).toBeOnTheScreen();
    expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
    expect(screen.getByText('Tap one to log it.')).toBeOnTheScreen();
  });

  test('with all four boxes the line stays "Tap one to log it" (K-1028 changes only the no-consent face)', async () => {
    await show();
    expect(within(screen.getByTestId('progress-hero')).getByText(t('progress.hero.tap'))).toBeOnTheScreen();
  });

  test('four boxes, each a button with the number from the server: calories, protein, steps, cardio', async () => {
    await show();
    expect(screen.getAllByTestId(/^target-/).map((b) => b.props.testID)).toEqual(['target-calories', 'target-protein', 'target-steps', 'target-cardio']);
    expect(words(box('calories'))).toContain('0');
    expect(words(box('calories'))).toContain('/ 2,916');
    expect(words(box('protein'))).toContain('/ 114 g');
    expect(words(box('steps'))).toContain('3,240');
    expect(words(box('steps'))).toContain('/ 7,000');
    expect(words(box('steps'))).toContain('Apple Health');
    expect(words(box('cardio'))).toContain('0');
    expect(words(box('cardio'))).toContain('/ 3 this week');
    expect(words(box('cardio'))).toContain('30 min each');
    for (const kind of ['calories', 'protein', 'steps', 'cardio']) expect(box(kind).props.accessibilityRole).toBe('button');
  });

  test('what was eaten is a range against the target (U5)', async () => {
    answers['/v1/days/{day}/budget'] = ok(budget({ kcal: { low: 1650, high: 1820 }, proteinG: { low: 70, high: 85 } }));
    await show();
    expect(words(box('calories'))).toContain('1,650-1,820');
    expect(words(box('protein'))).toContain('70-85');
    expect(box('calories').props.accessibilityLabel).toBe('Calories, between 1,650 and 1,820 of 2,916 kilocalories');
  });

  test('every box has 44 pt to touch and says where it goes', async () => {
    await show();
    for (const kind of ['calories', 'protein', 'steps', 'cardio']) {
      const flat = Object.assign({}, ...[box(kind).props.style].flat(2).filter(Boolean)) as { minHeight?: number };
      expect(flat.minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
      expect(box(kind).props.accessibilityHint).toBeTruthy();
    }
  });

  test('calories and protein open the meal (A3)', async () => {
    await show();
    await fireEvent.press(box('calories'));
    expect(mockPush).toHaveBeenLastCalledWith('/meal');
    await fireEvent.press(box('protein'));
    expect(mockPush).toHaveBeenLastCalledWith('/meal');
  });

  test('steps open Apple Health when it is connected', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await show();
    await fireEvent.press(box('steps'));
    expect(open).toHaveBeenCalledWith('x-apple-health://');
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('steps with Health not connected say so and lead to where it is connected', async () => {
    mockSyncHealth.mockResolvedValue({ weighIns: 0, stepsToday: null });
    await show();
    expect(words(box('steps'))).toContain('Connect Apple Health');
    // An empty state, not a target with no number before it (K-1066).
    expect(words(box('steps'))).toContain(t('progress.targets.noSteps'));
    expect(words(box('steps'))).not.toContain('/ 7,000');
    expect(box('steps').props.accessibilityLabel).toBe(t('progress.targets.label.stepsOff', { target: '7,000' }));
    await fireEvent.press(box('steps'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings');
  });

  test("cardio opens the cardio log itself, the screen the '+' sheet's Cardio row opens (ADR-078 Ek 2), not the sheet or the Train tab", async () => {
    await show();
    await fireEvent.press(box('cardio'));
    expect(mockPush).toHaveBeenCalledWith('/cardio');
    expect(mockPush).not.toHaveBeenCalledWith('/plus');
    expect(mockPush).not.toHaveBeenCalledWith('/train');
  });

  test('the cardio count is the server\'s', async () => {
    answers['/v1/program'] = ok(program({ doneThisWeek: 2, sessionsPerWeek: 4, minutes: 25 }));
    await show();
    expect(words(box('cardio'))).toContain('2');
    expect(words(box('cardio'))).toContain('/ 4 this week');
    expect(words(box('cardio'))).toContain('25 min each');
  });

  test("this week's planned muscles, drawn by the one map from the server's sets", async () => {
    await show();
    expect(screen.getByText(t('progress.muscles.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('progress.muscles.planned'))).toBeOnTheScreen();
    expect(mockMap).toHaveBeenLastCalledWith({ muscles: [muscle('quads', 10, 0), muscle('chest', 8, 0)], figure: 'female' });
  });

  test('no muscles planned (no program): no map, nothing empty', async () => {
    answers['/v1/training-progress'] = ok(training(0, 0));
    await show();
    expect(screen.queryByText(t('progress.muscles.title'))).toBeNull();
  });

  test('strength is locked until the first workout, and there is no chart', async () => {
    await show();
    expect(screen.getByTestId('strength-locked')).toBeOnTheScreen();
    expect(screen.getByText('After your first workout')).toBeOnTheScreen();
    expect(screen.queryByTestId('strength-chart')).toBeNull();
  });

  test('weight: 3 of 7 weigh-ins and when the trend shows; no chart', async () => {
    await show();
    expect(screen.getByText('3 of 7')).toBeOnTheScreen();
    expect(screen.getByText('Shows after 7 weigh-ins.')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^weight-dot-/)).toHaveLength(7);
    expect(screen.getAllByTestId('weight-dot-filled')).toHaveLength(3);
    expect(screen.getByTestId('weight-dots').props.accessibilityLabel).toBe(t('progress.weight.spoken', { count: 3, min: 7 }));
  });

  test('no result sentence, no 12 weeks, no spare week: nothing to show yet', async () => {
    await show();
    expect(screen.queryByTestId('consistency-grid')).toBeNull();
    expect(screen.queryByText(/Stronger on/)).toBeNull();
    expect(screen.queryByText(t('progress.consistency.title'))).toBeNull();
  });

  test('the day asked for is the phone\'s today', async () => {
    await show();
    expect(mockApiCalls).toContain('GET /v1/days/{day}/budget 2026-10-15');
  });
});

describe('after the first workout (ADR-078 Ek 2: strength opens by itself)', () => {
  beforeEach(() => {
    answers['/v1/training-progress'] = ok(training(0, 3, [muscle('quads', 10, 4)]));
  });

  test("the hero says so, the targets stay, and strength lists the baseline instead of the lock", async () => {
    await show();
    expect(screen.getByText("First workout in. Today's targets.")).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^target-/)).toHaveLength(4);
    expect(screen.queryByTestId('strength-locked')).toBeNull();
    expect(screen.getAllByTestId(/^strength-row-/).map((r) => r.props.testID)).toEqual(['strength-row-squat', 'strength-row-bench_press', 'strength-row-romanian_deadlift']);
    expect(screen.getByText(t('progress.strength.next'))).toBeOnTheScreen();
  });

  test("each lift with its best set in the user's unit", async () => {
    await show();
    expect(within(screen.getByTestId('strength-row-squat')).getByText('100 kg × 8')).toBeOnTheScreen();
  });

  test('in pounds', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    expect(within(screen.getByTestId('strength-row-squat')).getByText('220.5 lb × 8')).toBeOnTheScreen();
  });

  describe('a bodyweight move (K-1028, B4)', () => {
    const pullUp = { id: 'pull_up', nameKey: 'exercises.pull_up.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'BODYWEIGHT', equipment: 'BODYWEIGHT', unilateral: false, setupFields: [] };
    const weighted = { ...pullUp, id: 'dip', nameKey: 'exercises.dip.name', load: 'BODYWEIGHT_PLUS_EXTERNAL' };
    const set = { loadKg: 0, reps: 6, day: '2026-10-05' };

    test('the baseline says "Bodyweight x 6", not "0 kg x 6"', async () => {
      mockExercises = [pullUp];
      answers['/v1/training-progress'] = ok({ ...training(0, 2), lifts: [lift('pull_up', false, { baseline: set, best: set }), lift('squat', false)] });
      await show();
      const row = screen.getByTestId('strength-row-pull_up');
      expect(within(row).getByText(t('workout.bodyweight', { reps: 6 }))).toBeOnTheScreen();
      expect(within(row).queryByText(/0 kg/)).toBeNull();
      expect(row.props.accessibilityLabel).toBe(t('progress.strength.rowLabelBodyweight', { move: t('exercises.pull_up.name'), reps: 6 }));
      expect(row.props.accessibilityLabel).not.toMatch(/0 kg/);
      // An outside-load lift beside it keeps its load.
      expect(within(screen.getByTestId('strength-row-squat')).getByText('100 kg × 8')).toBeOnTheScreen();
    });

    test('a weighted move with nothing added reads as bodyweight, with a load as "+ load"', async () => {
      mockExercises = [weighted];
      const added = { loadKg: 10, reps: 6, day: '2026-10-05' };
      answers['/v1/training-progress'] = ok({ ...training(0, 1), lifts: [lift('dip', false, { baseline: set, best: set })] });
      await show();
      expect(within(screen.getByTestId('strength-row-dip')).getByText(t('workout.bodyweight', { reps: 6 }))).toBeOnTheScreen();
      answers['/v1/training-progress'] = ok({ ...training(0, 1), lifts: [lift('dip', false, { baseline: added, best: added })] });
      await act(async () => mockFocus());
      expect(within(screen.getByTestId('strength-row-dip')).getByText('+10 kg × 6')).toBeOnTheScreen();
    });

    test('the chart card says it the same way (best set and where it started)', async () => {
      mockExercises = [pullUp];
      const start = { loadKg: 0, reps: 5, day: '2026-09-07' };
      answers = weekTwelve();
      answers['/v1/training-progress'] = ok({ ...training(1, 1), lifts: [lift('pull_up', true, { baseline: start, best: set, weeks: liftWeeks([0, 0]) })] });
      await show();
      expect(screen.getByTestId('strength-best')).toHaveTextContent(t('workout.bodyweight', { reps: 6 }));
      expect(screen.getByText(t('progress.strength.started', { set: t('workout.bodyweight', { reps: 5 }) }))).toBeOnTheScreen();
    });
  });

  test('partial data: a first workout and only 3 of 7 weigh-ins shows the baseline and the dots, no chart of either', async () => {
    await show();
    expect(screen.getByText('3 of 7')).toBeOnTheScreen();
    expect(screen.queryByTestId('strength-chart')).toBeNull();
    expect(screen.queryByTestId('weight-chart')).toBeNull();
  });

  test('the muscle map fills with what was trained (the label says so)', async () => {
    await show();
    expect(screen.getByText(t('progress.muscles.thisWeek'))).toBeOnTheScreen();
  });
});

describe('the 12th week (ADR-078 #2)', () => {
  beforeEach(() => {
    answers = weekTwelve();
  });

  test('one sentence of results and the record, in place of the targets', async () => {
    await show();
    expect(screen.getByText('Stronger on 4 of 5 lifts. Down 3.8 kg.')).toBeOnTheScreen();
    expect(screen.getByText('11/12 weeks on track')).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/^target-/)).toHaveLength(0);
    expect(screen.queryByText("Today's targets.")).toBeNull();
  });

  test('the starting targets are not asked once there is a first call', async () => {
    await show();
    expect(mockApiCalls.some((c) => c.includes('/v1/targets/starting'))).toBe(false);
  });

  test("the weight change in the user's unit", async () => {
    mockUnits = 'IMPERIAL';
    await show();
    expect(screen.getByText('Stronger on 4 of 5 lifts. Down 8.4 lb.')).toBeOnTheScreen();
  });

  test('the 12 weeks: a cell each, in the order sent, the spare week and the paused week told apart', async () => {
    await show();
    const grid = screen.getByTestId('consistency-grid');
    const cells = within(grid).getAllByTestId(/^consistency-cell-/);
    expect(cells).toHaveLength(12);
    expect(cells.map((c) => c.props.testID.split('-')[2])).toEqual(['ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'SPARE', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'MISSED', 'PAUSED', 'ON_TRACK', 'ON_TRACK']);
    expect(grid.props.accessibilityLabel).toBe(t('progress.consistency.spoken', { count: 12, onTrack: 9, spare: 1, paused: 1, other: 1 }));
    expect(screen.getByText('Spare week')).toBeOnTheScreen();
    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(screen.getByText('A missed week never resets your record.')).toBeOnTheScreen();
  });

  test('a missed week is in the spoken summary only as "other weeks", never named', async () => {
    await show();
    const said = screen.getByTestId('consistency-grid').props.accessibilityLabel as string;
    expect(said).toContain('1 other weeks');
    expect(said).not.toMatch(/miss/i);
  });

  test('the trend not ready yet: the weigh-ins toward it stay after the first call too', async () => {
    answers['/v1/weigh-ins/summary'] = ok(summary(3));
    await show();
    expect(screen.getByText('3 of 7')).toBeOnTheScreen();
    expect(screen.getByText('Shows after 7 weigh-ins.')).toBeOnTheScreen();
  });

  test('a missed week is not named (U7): the legend says "Other weeks", never "missed", and there is no red', async () => {
    await show();
    expect(screen.queryByText(/missed$/i)).toBeNull();
    expect(screen.queryByText(/Missed/)).toBeNull();
    expect(screen.getByText(t('progress.consistency.other'))).toBeOnTheScreen();
  });

  test('a short history is a short row, never padded or filled', async () => {
    answers['/v1/consistency'] = ok(consistency({ weeks: weeks(['ON_TRACK', 'MISSED', 'ON_TRACK']), record: { onTrackWeeks: 2, countedWeeks: 3, currentRun: 1, forgivenWeeks: 0 } }));
    await show();
    expect(within(screen.getByTestId('consistency-grid')).getAllByTestId(/^consistency-cell-/)).toHaveLength(3);
    expect(screen.queryByText('Spare week')).toBeNull();
    expect(screen.queryByText('Paused')).toBeNull();
  });

  test('no week over yet: no grid, no empty row', async () => {
    answers['/v1/consistency'] = ok(consistency({ weeks: [], record: { onTrackWeeks: 0, countedWeeks: 0, currentRun: 0, forgivenWeeks: 0 } }));
    await show();
    expect(screen.queryByTestId('consistency-grid')).toBeNull();
    expect(screen.queryByText(t('progress.consistency.title'))).toBeNull();
  });

  test('the spare cells and the forgiven weeks need not agree: the grid shows what it is sent', async () => {
    answers['/v1/consistency'] = ok(consistency({ weeks: weeks(['SPARE', 'ON_TRACK']), record: { onTrackWeeks: 40, countedWeeks: 52, currentRun: 2, forgivenWeeks: 5 } }));
    await show();
    expect(screen.getByText('40/52 weeks on track')).toBeOnTheScreen();
    expect(screen.getByTestId('consistency-grid').props.accessibilityLabel).toBe(t('progress.consistency.spoken', { count: 2, onTrack: 1, spare: 1, paused: 0, other: 0 }));
  });

  test('sets per muscle: a bar each, this week against the target, under the map that stays (K-1065)', async () => {
    await show();
    expect(screen.getByText(t('progress.muscles.setsTitle'))).toBeOnTheScreen();
    expect(screen.getByTestId('muscle-bar-quads').props.accessibilityLabel).toBe(t('progress.muscles.barLabel', { muscle: t('demo.muscle.quads'), done: 6, target: 10 }));
    expect(screen.getByText(t('progress.muscles.title'))).toBeOnTheScreen();
    expect(mockMap).toHaveBeenCalled();
  });

  test('the trend ready: the 3 of 7 card is gone', async () => {
    await show();
    expect(screen.queryByText('Shows after 7 weigh-ins.')).toBeNull();
    expect(screen.queryByTestId('weight-dots')).toBeNull();
  });

  test('strength is not locked; its baseline lists the lifts', async () => {
    await show();
    expect(screen.queryByTestId('strength-locked')).toBeNull();
    expect(screen.getAllByTestId(/^strength-row-/)).toHaveLength(5);
  });

  test('after the first call but before anything to say: one plain line', async () => {
    answers['/v1/training-progress'] = ok(training(0, 0));
    answers['/v1/consistency'] = ok(consistency({ weeks: [], record: { onTrackWeeks: 0, countedWeeks: 0, currentRun: 0, forgivenWeeks: 0 } }));
    await show();
    expect(screen.getByText(t('progress.hero.early'))).toBeOnTheScreen();
  });
});

describe('without the health data consent', () => {
  beforeEach(() => {
    answers = {
      '/v1/training-progress': ok(training(0, 0, [muscle('quads', 10, 0)])),
      '/v1/consistency': { status: 403, code: 'CONSENT_REQUIRED' },
      '/v1/weigh-ins/summary': { status: 403, code: 'CONSENT_REQUIRED' },
      '/v1/days/{day}/budget': { status: 403, code: 'CONSENT_REQUIRED' },
      '/v1/targets/starting': { status: 403, code: 'CONSENT_REQUIRED' },
      '/v1/program': ok(program({})),
    };
  });

  test('a lock line with Allow in its place; no food, steps or weight cards', async () => {
    await show();
    expect(screen.getByTestId('progress-locked')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('thisWeek.food.allowLabel') }));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    expect(screen.queryByTestId('target-calories')).toBeNull();
    expect(screen.queryByTestId('target-protein')).toBeNull();
    expect(screen.queryByTestId('target-steps')).toBeNull();
    expect(screen.queryByText(t('progress.weight.title'))).toBeNull();
    expect(screen.queryByText('Shows after 7 weigh-ins.')).toBeNull();
  });

  test('cardio, the muscles and the strength lock are training, not health data: they stay', async () => {
    await show();
    expect(screen.getByTestId('target-cardio')).toBeOnTheScreen();
    expect(screen.getByText(t('progress.muscles.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('strength-locked')).toBeOnTheScreen();
  });

  test('no first day claimed with the targets: the hero is the plain one', async () => {
    await show();
    expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
  });

  test('the hero line under it fits the one box that is there: it names Cardio, not "one" of several (K-1028, B5)', async () => {
    await show();
    const hero = screen.getByTestId('progress-hero');
    expect(within(hero).getByText(t('progress.hero.tapLocked'))).toBeOnTheScreen();
    expect(within(hero).queryByText(t('progress.hero.tap'))).toBeNull();
    expect(t('progress.hero.tapLocked')).toContain('Cardio');
    expect(screen.getAllByTestId(/^target-/)).toHaveLength(1);
  });
});

describe('a part that did not load', () => {
  test('the consistency offline: no first day is shown to someone who may be past it, and it says so with a retry', async () => {
    answers['/v1/consistency'] = 'offline';
    await show();
    expect(screen.queryByText("Today's targets.")).toBeNull();
    expect(screen.queryAllByTestId(/^target-/)).toHaveLength(0);
    expect(screen.getByText(t('progress.failed'))).toBeOnTheScreen();
    answers['/v1/consistency'] = { status: 404 };
    await fireEvent.press(screen.getByRole('button', { name: t('progress.retry') }));
    await act(async () => {});
    expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
  });

  test('the training progress failing leaves no strength claim and no map, the rest stays', async () => {
    answers['/v1/training-progress'] = { status: 500, code: 'INTERNAL' };
    await show();
    expect(screen.queryByTestId('strength-locked')).toBeNull();
    expect(screen.queryByText(t('progress.muscles.title'))).toBeNull();
    expect(screen.getByTestId('target-calories')).toBeOnTheScreen();
    expect(screen.getByText(t('progress.failed'))).toBeOnTheScreen();
  });

  test('Health failing to read does not keep the screen from showing (reported by name)', async () => {
    mockSyncHealth.mockRejectedValue(new TypeError('x'));
    await show();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'TypeError' });
    expect(words(box('steps'))).toContain('Connect Apple Health');
  });

  test('read again whenever the tab comes into view: the first call just made shows at once', async () => {
    await show();
    expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
    answers = weekTwelve();
    await act(async () => mockFocus());
    expect(screen.getByText('Stronger on 4 of 5 lifts. Down 3.8 kg.')).toBeOnTheScreen();
  });
});

describe.each(['light', 'dark'] as const)('in the %s theme', (scheme) => {
  const flat = (el: Node) => Object.assign({}, ...[el.props.style].flat(2).filter(Boolean)) as { backgroundColor?: string };

  test('the boxes are the theme\'s surface, the hero its inverse block', async () => {
    await show(scheme);
    expect(flat(box('calories')).backgroundColor).toBe(palettes[scheme].surface);
    expect(flat(screen.getByTestId('progress-hero')).backgroundColor).toBe(palettes[scheme].decisionBackground);
  });

  test("the charts draw on the theme: the latest point on the accent, the held ring on the accent, the line in the text colour", async () => {
    withLifts();
    await show(scheme);
    // react-native-svg keeps a colour as its processed value: opaque ARGB of the hex.
    const colour = (hex: string) => ({ payload: 0xff000000 + parseInt(hex.slice(1), 16), type: 0 });
    const props = (id: string) => screen.getByTestId(id).props as { fill?: unknown; stroke?: unknown };
    expect(props('strength-point-2026-09-21').fill).toEqual(colour(palettes[scheme].accent));
    expect(props('strength-held-2026-09-14').stroke).toEqual(colour(palettes[scheme].accent));
    expect(props('strength-line').stroke).toEqual(colour(palettes[scheme].text));
    expect(props('weight-point-2026-10-15').fill).toEqual(colour(palettes[scheme].accent));
  });

  test('the 12 weeks draw on the theme\'s accent, spare and missed apart', async () => {
    answers = weekTwelve();
    await show(scheme);
    const cell = (state: string) => flat(screen.getAllByTestId(new RegExp(`^consistency-cell-${state}-`))[0]) as { backgroundColor?: string; borderColor?: string };
    expect(cell('ON_TRACK').backgroundColor).toBe(palettes[scheme].accent);
    expect(cell('SPARE').backgroundColor).toBe(palettes[scheme].accentSoft);
    expect(cell('MISSED').backgroundColor).toBe(palettes[scheme].weekMissed);
  });
});

describe('the tab keeps its other ways in', () => {
  test('the "+" is still there', async () => {
    await show();
    expect(screen.getByRole('button', { name: t('plus.entry') })).toBeOnTheScreen();
  });

  test('share your progress: the user starts it, from here (K-612)', async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('share.open') }));
    expect(mockPush).toHaveBeenCalledWith('/share');
  });

  test('the projection and the coach are off the tab (ADR-069 #3)', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('projection.view.title') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
  });
});

/** The 12th week with two lifts to draw: squat has three weeks (one held, an effort line), bench has one. */
const withLifts = () => {
  answers = weekTwelve();
  const squat = lift('squat', true, {
    best: { loadKg: 105, reps: 8, rir: 1, day: '2026-09-21' },
    baseline: { loadKg: 100, reps: 8, rir: 1, day: '2026-09-07' },
    weeks: liftWeeks([100, 102.5, 105], [1]),
    effort: { kind: 'STUCK', loadKg: 105, sessions: 3, held: true },
  });
  const bench = lift('bench_press', false, {
    best: { loadKg: 60, reps: 10, rir: 2, day: '2026-09-07' },
    baseline: { loadKg: 60, reps: 10, rir: 2, day: '2026-09-07' },
    weeks: liftWeeks([60]),
  });
  answers['/v1/training-progress'] = ok({ ...training(1, 2, [muscle('quads', 10, 6)]), lifts: [squat, bench] });
};
const chart = () => screen.getByTestId('strength-chart');
const svgText = (el: Node): string => el.children.map((child) => (typeof child === 'string' ? child : ((child.props.content as string | undefined) ?? svgText(child)))).join('');

describe('strength: the lifts, the best set, the effort (ADR-078 #2, Ek 3)', () => {
  beforeEach(withLifts);

  test("a chip for each lift in the program's order; the first is picked", async () => {
    await show();
    const chips = within(screen.getByTestId('strength-chips')).getAllByRole('button');
    expect(chips.map((c) => c.props.accessibilityState.selected)).toEqual([true, false]);
    expect(screen.getByRole('button', { name: t('exercises.squat.name') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('exercises.bench_press.name') })).toBeOnTheScreen();
  });

  test('the real best set large, where it started (nothing worked out), and no estimated max', async () => {
    await show();
    expect(screen.getByTestId('strength-best')).toHaveTextContent('105 kg × 8');
    expect(screen.getByText('Started at 100 kg × 8')).toBeOnTheScreen();
    expect(screen.queryByText(/estimated|1RM/i)).toBeNull();
  });

  test('the chart: a point for each week, joined in order, labelled with the lowest and highest week', async () => {
    await show();
    const points = within(chart()).getAllByTestId(/^strength-point-/);
    expect(points).toHaveLength(3);
    expect(within(chart()).getAllByTestId('strength-tick').map(svgText)).toEqual(['100 kg', '105 kg']);
    const xs = points.map((p) => (p.props as { cx: number }).cx);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  test('the weeks the call held the load are ringed, and said', async () => {
    await show();
    expect(within(chart()).getAllByTestId(/^strength-held-/).map((r) => r.props.testID)).toEqual(['strength-held-2026-09-14']);
    expect(screen.getByText(t('progress.strength.legendHeld'))).toBeOnTheScreen();
    expect(chart().props.accessibilityLabel).toContain(t('progress.strength.spokenHeld', { weeks: 'Sep 14' }));
  });

  test('VoiceOver gets the chart as one image, with its first and last week and its extremes', async () => {
    await show();
    expect(chart().props.accessibilityRole).toBe('image');
    expect(chart().props.accessibilityLabel).toContain(
      t('progress.strength.spoken', { move: t('exercises.squat.name'), first: '100 kg', firstDate: 'Sep 7', last: '105 kg', lastDate: 'Sep 21', low: '100 kg', high: '105 kg' }),
    );
  });

  test("the effort line, from the server's facts", async () => {
    await show();
    expect(screen.getByTestId('strength-effort')).toHaveTextContent('Stuck at 105 kg for 3 sessions. Held this week.');
  });

  test("a lift with no effort has no line (the prototype's extra sentences are not here)", async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
    expect(screen.queryByTestId('strength-effort')).toBeNull();
  });

  test('picking another lift changes the set and the pick (flow D)', async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
    expect(screen.getByTestId('strength-best')).toHaveTextContent('60 kg × 10');
    expect(screen.getByRole('button', { name: t('exercises.bench_press.name') }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: t('exercises.squat.name') }).props.accessibilityState.selected).toBe(false);
  });

  test('a lift with one week is not drawn as a chart (a point is not a line)', async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
    expect(screen.queryByTestId('strength-chart')).toBeNull();
    expect(screen.getByTestId('strength-best')).toBeOnTheScreen();
  });

  test('in pounds', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    expect(screen.getByTestId('strength-best')).toHaveTextContent('231.5 lb × 8');
    expect(within(chart()).getAllByTestId('strength-tick').map(svgText)).toEqual(['220.5 lb', '231.5 lb']);
  });

  test('opens on the first lift that has a chart, the first lift when none has', async () => {
    const squat = lift('squat', false, { weeks: liftWeeks([100]) });
    const bench = lift('bench_press', true, { weeks: liftWeeks([60, 62.5]) });
    answers['/v1/training-progress'] = ok({ ...training(1, 2), lifts: [squat, bench] });
    await show();
    expect(screen.getByRole('button', { name: t('exercises.bench_press.name') }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('strength-chart')).toBeOnTheScreen();
  });

  test('25 lifts: one horizontal row of chips, never a wrapped block, and the chart is still there (K-1028, B1)', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `lift_${i}`);
    const lifts = ids.map((id, i) => lift(id, i === 0, { weeks: liftWeeks([100, 102.5, 105]) }));
    answers['/v1/training-progress'] = ok({ ...training(1, 25), lifts });
    await show();
    const row = screen.getByTestId('strength-chips');
    expect(row.props.horizontal).toBe(true);
    expect(row.props.showsHorizontalScrollIndicator).toBe(false);
    expect(within(row).getAllByRole('button')).toHaveLength(25);
    expect(chart()).toBeOnTheScreen();
    expect(screen.getByTestId('strength-best')).toBeOnTheScreen();
  });

  test('the row opens scrolled to the lift shown, so it is never out of sight (K-1028)', async () => {
    const scrolls = jest.spyOn(ScrollView.prototype, 'scrollTo');
    try {
      const squat = lift('squat', false, { weeks: liftWeeks([100]) });
      const bench = lift('bench_press', true, { weeks: liftWeeks([60, 62.5]) });
      answers['/v1/training-progress'] = ok({ ...training(1, 2), lifts: [squat, bench] });
      await show();
      // The shown lift is bench (the first with a chart); its chip's wrapper gets its place from layout.
      const wrapper = screen.getByRole('button', { name: t('exercises.bench_press.name') }).parent as NonNullable<Node['parent']>;
      const other = screen.getByRole('button', { name: t('exercises.squat.name') }).parent as NonNullable<Node['parent']>;
      scrolls.mockClear();
      await fireEvent(other, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 90, height: 44 } } });
      expect(scrolls).not.toHaveBeenCalled();
      await fireEvent(wrapper, 'layout', { nativeEvent: { layout: { x: 400, y: 0, width: 90, height: 44 } } });
      expect(scrolls).toHaveBeenCalledTimes(1);
      expect(scrolls).toHaveBeenCalledWith({ x: 400 - tokens.space.md, animated: false });
      // Near the start it never scrolls to a negative place.
      await fireEvent(wrapper, 'layout', { nativeEvent: { layout: { x: 4, y: 0, width: 90, height: 44 } } });
      expect(scrolls).toHaveBeenLastCalledWith({ x: 0, animated: false });
    } finally {
      scrolls.mockRestore();
    }
  });

  test('one lift: no chips to pick from', async () => {
    answers['/v1/training-progress'] = ok({ ...training(1, 1), lifts: [lift('squat', true, { weeks: liftWeeks([100, 105]) })] });
    await show();
    expect(screen.queryByTestId('strength-chips')).toBeNull();
    expect(chart()).toBeOnTheScreen();
  });

  test('a picked lift gone from the next read: the first lift shown, no crash', async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
    answers['/v1/training-progress'] = ok({ ...training(1, 1), lifts: [lift('squat', true, { weeks: liftWeeks([100, 105]) })] });
    await act(async () => mockFocus());
    expect(chart()).toBeOnTheScreen();
  });

  test("the first workout's form stays while no lift has two weeks and no effort: the baseline list, no chart", async () => {
    answers['/v1/training-progress'] = ok({ ...training(0, 2), lifts: [lift('squat', false, { weeks: liftWeeks([100]) }), lift('bench_press', false, { weeks: liftWeeks([60]) })] });
    await show();
    expect(screen.getAllByTestId(/^strength-row-/)).toHaveLength(2);
    expect(screen.queryByTestId('strength-chart')).toBeNull();
    expect(screen.queryByTestId('strength-chips')).toBeNull();
  });
});

describe('weight: the 7-day average (ADR-078 #2, Ek 3)', () => {
  beforeEach(() => {
    answers = weekTwelve();
  });

  test('the average of the days the server has: the latest large, a chart, nothing of the dots', async () => {
    await show();
    expect(screen.getByText(t('progress.weight.chartTitle'))).toBeOnTheScreen();
    expect(screen.getByText(t('progress.weight.average'))).toBeOnTheScreen();
    expect(screen.getByTestId('weight-latest')).toHaveTextContent('80.2 kg');
    expect(within(screen.getByTestId('weight-chart')).getAllByTestId(/^weight-point-/)).toHaveLength(7);
    expect(screen.queryByTestId('weight-dots')).toBeNull();
  });

  test('labels are the lowest and highest day, and VoiceOver gets the chart as one image', async () => {
    await show();
    const weightChart = screen.getByTestId('weight-chart');
    expect(within(weightChart).getAllByTestId('weight-tick').map(svgText)).toEqual(['80.2 kg', '84.1 kg']);
    expect(weightChart.props.accessibilityRole).toBe('image');
    expect(weightChart.props.accessibilityLabel).toBe(
      t('progress.weight.chartSpoken', { first: '84.1 kg', firstDate: 'Oct 9', last: '80.2 kg', lastDate: 'Oct 15', low: '80.2 kg', high: '84.1 kg' }),
    );
  });

  test('asked for the twelve weeks ending today, and only once the trend is ready', async () => {
    await show();
    expect(mockQueries['/v1/weight-trend']).toEqual({ from: '2026-07-24', to: '2026-10-15' });
    answers = firstDay();
    mockApiCalls.length = 0;
    await act(async () => mockFocus());
    expect(mockApiCalls.some((c) => c.includes('weight-trend'))).toBe(false);
  });

  test('in pounds', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    expect(screen.getByTestId('weight-latest')).toHaveTextContent('176.8 lb');
  });

  test('one point: the value, no chart', async () => {
    answers['/v1/weight-trend'] = ok(trendPoints([80.2]));
    await show();
    expect(screen.getByTestId('weight-latest')).toHaveTextContent('80.2 kg');
    expect(screen.queryByTestId('weight-chart')).toBeNull();
  });

  test('ready but no day in the window: the dots stay, with the line that says what brings the average back', async () => {
    answers['/v1/weight-trend'] = ok([]);
    await show();
    expect(screen.getByTestId('weight-dots')).toBeOnTheScreen();
    expect(screen.getByText(t('progress.weight.stale'))).toBeOnTheScreen();
    expect(screen.queryByText('Shows after 7 weigh-ins.')).toBeNull();
    expect(screen.queryByTestId('weight-chart')).toBeNull();
  });

  test('the trend failing to read: the dots stay, no chart, no line that blames the user, and a retry', async () => {
    answers['/v1/weight-trend'] = 'offline';
    await show();
    expect(screen.getByTestId('weight-dots')).toBeOnTheScreen();
    expect(screen.queryByTestId('weight-chart')).toBeNull();
    expect(screen.queryByText(t('progress.weight.stale'))).toBeNull();
    expect(screen.queryByText('Shows after 7 weigh-ins.')).toBeNull();
    expect(screen.getByText(t('progress.failed'))).toBeOnTheScreen();
    answers['/v1/weight-trend'] = ok(trendPoints([81, 80.5, 80]));
    await fireEvent.press(screen.getByRole('button', { name: t('progress.retry') }));
    await act(async () => {});
    expect(screen.getByTestId('weight-chart')).toBeOnTheScreen();
  });

  test('a trend with nothing to read for this account (not found): the dots, no stale line', async () => {
    answers['/v1/weight-trend'] = { status: 404 };
    await show();
    expect(screen.getByTestId('weight-dots')).toBeOnTheScreen();
    expect(screen.queryByText(t('progress.weight.stale'))).toBeNull();
  });

  test('a range narrower than one shown step is a flat line at half height with one label: noise is not a trend', async () => {
    answers['/v1/weight-trend'] = ok(trendPoints([80.21, 80.24, 80.22, 80.26, 80.23]));
    await show();
    const weightChart = screen.getByTestId('weight-chart');
    expect(within(weightChart).getAllByTestId('weight-tick')).toHaveLength(1);
    const ys = within(weightChart).getAllByTestId(/^weight-point-/).map((p) => (p.props as { cy: number }).cy);
    expect(new Set(ys).size).toBe(1);
    expect(ys[0]).toBe(66); // half way between the chart's top (14) and bottom (118)
  });

  test('a range of a step or more is drawn as it is', async () => {
    answers['/v1/weight-trend'] = ok(trendPoints([80.2, 80.3, 80.5]));
    await show();
    const ys = within(screen.getByTestId('weight-chart')).getAllByTestId(/^weight-point-/).map((p) => (p.props as { cy: number }).cy);
    expect(new Set(ys).size).toBe(3);
    expect(within(screen.getByTestId('weight-chart')).getAllByTestId('weight-tick')).toHaveLength(2);
  });

  test('one point: its day, as the server gave it', async () => {
    answers['/v1/weight-trend'] = ok(trendPoints([80.2]));
    await show();
    expect(screen.getByTestId('weight-latest-day')).toHaveTextContent('Oct 15');
  });

  test('a chart has no extra day line (its last date is under the chart)', async () => {
    await show();
    expect(screen.queryByTestId('weight-latest-day')).toBeNull();
  });
});

describe('sets per muscle (ADR-078 #4)', () => {
  test("a bar for each muscle the server lists, with this week's sets of the target", async () => {
    answers = weekTwelve();
    answers['/v1/training-progress'] = ok(training(4, 5, [muscle('quads', 10, 6), muscle('chest', 8, 12)]));
    await show();
    expect(screen.getAllByTestId(/^muscle-bar-/).map((b) => b.props.testID)).toEqual(['muscle-bar-quads', 'muscle-bar-chest']);
    expect(within(screen.getByTestId('muscle-bar-quads')).getByText('6/10')).toBeOnTheScreen();
    expect(within(screen.getByTestId('muscle-bar-chest')).getByText('12/10')).toBeOnTheScreen();
  });

  test("before the first call the map stays (the first days' form)", async () => {
    await show();
    expect(screen.queryByText(t('progress.muscles.setsTitle'))).toBeNull();
    expect(mockMap).toHaveBeenCalled();
  });
});

describe('calls (ADR-078 #2, Ek 3)', () => {
  beforeEach(() => {
    answers = weekTwelve();
  });

  test('the latest calls, each a button with its date and what the call was', async () => {
    await show();
    expect(screen.getByText(t('progress.calls.title'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('call-c2')).getByText(t('decision.continue.toward_goal.title'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('call-c2')).getByText('Oct 12')).toBeOnTheScreen();
    expect(screen.getByTestId('call-c2').props.accessibilityRole).toBe('button');
  });

  test('asked for as many as progress.json shows', async () => {
    await show();
    expect(mockQueries['/v1/decisions']).toEqual({ limit: 12 });
  });

  test('a call that was not applied says so, in words and for VoiceOver', async () => {
    await show();
    expect(within(screen.getByTestId('call-c1')).getByText(t('progress.calls.notApplied'))).toBeOnTheScreen();
    expect(screen.getByTestId('call-c1').props.accessibilityLabel).toBe(
      t('progress.calls.rowLabelNotApplied', { title: t('decision.continue.toward_goal.title'), date: 'Oct 5' }),
    );
    expect(within(screen.getByTestId('call-c2')).queryByText(t('progress.calls.notApplied'))).toBeNull();
  });

  test('a call opens the call screen, read only, coming back to Progress', async () => {
    await show();
    await fireEvent.press(screen.getByTestId('call-c1'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/call', params: { id: 'c1', from: 'progress' } });
  });

  test('44 pt to touch', async () => {
    await show();
    const flat = Object.assign({}, ...[screen.getByTestId('call-c2').props.style].flat(2).filter(Boolean)) as { minHeight?: number };
    expect(flat.minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
  });

  test('no way leads to the ledger screen, which is off the surface (ADR-069 #3)', async () => {
    answers['/v1/decisions'] = ok(decisionPage([decision('c2', '2026-10-12')], 'cursor'));
    await show();
    for (const button of screen.getAllByRole('button')) await fireEvent.press(button);
    expect(mockPush).not.toHaveBeenCalledWith('/ledger');
  });

  test('no call yet: no card', async () => {
    answers['/v1/decisions'] = ok(decisionPage([]));
    await show();
    expect(screen.queryByText(t('progress.calls.title'))).toBeNull();
  });

  test('before the first call there are none to list', async () => {
    answers = firstDay();
    await show();
    expect(screen.queryByText(t('progress.calls.title'))).toBeNull();
  });
});

describe('privacy (V1): nothing written, nothing about a photo, leaves the phone from this tab', () => {
  const KNOWN = [
    'GET /v1/training-progress',
    'GET /v1/consistency',
    'GET /v1/weigh-ins/summary',
    'GET /v1/days/{day}/budget 2026-10-15',
    'GET /v1/program',
    'GET /v1/targets/starting',
    'GET /v1/first-weeks',
    'GET /v1/decisions',
    'GET /v1/weight-trend',
  ];

  test.each([
    ['the first days', firstDay],
    ['the 12th week', weekTwelve],
  ])('%s: only reads, only from the known list, with photos on the phone', async (_, scenario) => {
    answers = scenario();
    mockPhotoChecks = [{ takenOn: '2026-09-20', photos: { front: 'file:///docs/2026-09-20-front.jpg' } }];
    await show();
    await act(async () => mockFocus());
    expect(mockApiCalls.length).toBeGreaterThan(0);
    expect(mockApiCalls.filter((call) => !call.startsWith('GET '))).toEqual([]);
    expect(mockApiCalls.filter((call) => !KNOWN.includes(call))).toEqual([]);
  });

  test('pressing every button of the tab sends nothing either', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockPhotoChecks = [{ takenOn: '2026-09-20', photos: { front: 'file:///docs/2026-09-20-front.jpg' } }];
    await show();
    mockApiCalls.length = 0;
    for (const button of screen.getAllByRole('button')) await fireEvent.press(button);
    expect(mockApiCalls.filter((call) => !call.startsWith('GET '))).toEqual([]);
  });
});

describe('photos (K-614) stay on the tab', () => {
  test('the photos card, with the first photo due in week 4 while the first weeks run', async () => {
    answers['/v1/first-weeks'] = ok({ week: 2, risk: [], readsRisk: false, training: true });
    await show();
    expect(screen.getByTestId('photo-card')).toBeOnTheScreen();
    expect(screen.getByText(t('photos.first', { week: 4 }))).toBeOnTheScreen();
  });

  test('the first weeks over (404): the first photo is due', async () => {
    await show();
    expect(screen.getByText(t('photos.firstDue'))).toBeOnTheScreen();
  });

  test('no health consent: the week is unknown, the photo offered without being called due', async () => {
    answers['/v1/first-weeks'] = { status: 403, code: 'CONSENT_REQUIRED' };
    await show();
    expect(screen.getByText(t('photos.anytime'))).toBeOnTheScreen();
  });

  test('offline: the week is unknown, not over', async () => {
    answers['/v1/first-weeks'] = 'offline';
    await show();
    expect(screen.getByText(t('photos.anytime'))).toBeOnTheScreen();
  });

  test('with photos, the window counts from the last one to today', async () => {
    mockPhotoChecks = [{ takenOn: '2026-08-01', photos: { front: 'file:///docs/2026-08-01-front.jpg' } }];
    await show();
    expect(screen.getByText(t('photos.open', { date: 'Aug 29' }))).toBeOnTheScreen();
  });

  test('nothing about a photo is asked of the server', async () => {
    mockPhotoChecks = [{ takenOn: '2026-09-20', photos: { front: 'file:///docs/2026-09-20-front.jpg' } }];
    await show();
    expect(mockApiCalls.filter((c) => /photo/i.test(c))).toEqual([]);
  });
});

describe('on the system (K-1045, T-8, ADR-070 Ek 2 #7, #8)', () => {
  const flatten = (node: Node) => (StyleSheet.flatten(node.props.style as never) ?? {}) as { backgroundColor?: string; fontSize?: number; fontWeight?: string; fontFamily?: string; color?: string };

  beforeEach(() => {
    answers = weekTwelve();
    mockPhotoChecks = [{ takenOn: '2026-09-20', photos: { front: 'file:///docs/2026-09-20-front.jpg' } }];
  });

  test('the sections are surface cards, as the target boxes above them (ADR-070 Ek 4, K-1054): strength, sets, weight, consistency, photos', async () => {
    await show();
    for (const id of ['section-strength', 'section-sets', 'section-weight', 'section-consistency', 'photo-card']) {
      expect(flatten(screen.getByTestId(id)).backgroundColor).toBe(palettes.light.surface);
    }
  });

  test('every section heading is the same type, Photos too (it was in another)', async () => {
    await show();
    const heading = (id: string) => flatten(within(screen.getByTestId(id)).getAllByRole('header')[0]);
    const first = heading('section-strength');
    // Inside the card, the target boxes' title (ADR-070 Ek 4, K-1054).
    expect(first).toMatchObject({ fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold, color: palettes.light.muted });
    for (const id of ['section-sets', 'section-weight', 'section-consistency', 'section-calls', 'photo-card']) expect(heading(id)).toEqual(first);
  });

  test('the decision block and the calls list keep their surfaces; they have a role (Ek 2 #8)', async () => {
    await show();
    expect(screen.getByTestId('progress-hero')).toBeOnTheScreen();
    expect(flatten(screen.getByTestId('calls-list')).backgroundColor).toBe(palettes.light.surface);
  });

  test('the 12 weeks say in words what a filled and an empty square mean, not by colour alone', async () => {
    await show();
    const grid = within(screen.getByTestId('section-consistency'));
    expect(grid.getByText(t('progress.consistency.range'))).toBeOnTheScreen();
    expect(grid.getByText(t('progress.consistency.onTrack'))).toBeOnTheScreen();
    expect(grid.getByText(t('progress.consistency.other'))).toBeOnTheScreen();
    expect(grid.getByText(t('progress.consistency.spare'))).toBeOnTheScreen();
    expect(grid.getByText(t('progress.consistency.paused'))).toBeOnTheScreen();
    // The legend swatches draw the cells' own looks.
    expect(flatten(grid.getByTestId('legend-swatch-ON_TRACK')).backgroundColor).toBe(palettes.light.accent);
    expect(flatten(grid.getByTestId('legend-swatch-MISSED')).backgroundColor).toBe(palettes.light.weekMissed);
  });

  test('Delete all photos is a destructive text button after the primary, not beside it', async () => {
    await show();
    const names = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string);
    const take = names.indexOf(t('photos.take'));
    const remove = names.indexOf(t('photos.delete'));
    expect(take).toBeGreaterThanOrEqual(0);
    expect(remove).toBeGreaterThan(take);
    const button = screen.getByRole('button', { name: t('photos.delete') });
    expect(flatten(button).backgroundColor).toBeUndefined();
    expect(flatten(within(button).getByText(t('photos.delete'))).color).toBe(palettes.light.warn);
    // Compare (when there is one) is between them; the primary keeps the cta.
    expect(flatten(screen.getByRole('button', { name: t('photos.take') })).backgroundColor).toBe(palettes.light.cta);
  });

  test('the week count under the decision is the one This week shows: "11/12 weeks on track"', async () => {
    await show();
    expect(screen.getByText('11/12 weeks on track')).toBeOnTheScreen();
    expect(screen.queryByText(/weeks · /)).toBeNull();
  });
});
