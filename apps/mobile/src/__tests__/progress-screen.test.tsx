/**
 * The Progress tab (K-979, ADR-078 + Ek 1 + Ek 2, prototype `#progress`): the first days are four tappable targets, this
 * week's planned muscles, a locked strength and the weigh-ins toward the trend; after the first call, one sentence of results
 * and the 12 weeks. Each part opens when its own data comes (first workout, 7 weigh-ins, first call); no chart is drawn
 * empty. Every number is the server's; the screen counts nothing.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import ProgressScreen from '@/app/(tabs)/progress';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

import { budget, consistency, muscle, program, starting, summary, training, weeks } from './support/progressFixtures';

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
const mockApi = new Proxy(
  {},
  {
    get: (_target, method: string) => async (path: string, options?: { params?: { path?: { day?: string } } }) => {
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
const mockServices = {
  api: mockApi,
  photos: { checks: jest.fn(async () => mockPhotoChecks), forget: jest.fn(async () => {}) },
  training: {
    read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: [] }, kept: false }),
    own: async () => [],
  },
  syncHealth: () => mockSyncHealth(),
  bodyFigure: async () => 'female',
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
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUnits = 'METRIC';
  mockApiCalls.length = 0;
  mockPhotoChecks = [];
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

describe('the first days (ADR-078 #1)', () => {
  test("the title, today's targets and how to use them", async () => {
    await show();
    expect(screen.getByRole('header', { name: t('screens.progress.title') })).toBeOnTheScreen();
    expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
    expect(screen.getByText('Tap one to log it.')).toBeOnTheScreen();
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
    expect(box('steps').props.accessibilityLabel).toBe(t('progress.targets.label.stepsOff', { target: '7,000' }));
    await fireEvent.press(box('steps'));
    expect(mockPush).toHaveBeenLastCalledWith('/settings');
  });

  test("cardio opens the '+' sheet where the cardio log is (ADR-078 Ek 2), not the Train tab", async () => {
    await show();
    await fireEvent.press(box('cardio'));
    expect(mockPush).toHaveBeenCalledWith('/plus');
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
    expect(screen.getByText('12 weeks · 11 on track')).toBeOnTheScreen();
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

  test('a missed week is not named: no legend entry, no red', async () => {
    await show();
    expect(screen.queryByText(/missed$/i)).toBeNull();
    expect(screen.queryByText(/Missed/)).toBeNull();
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
    expect(screen.getByText('52 weeks · 40 on track')).toBeOnTheScreen();
    expect(screen.getByTestId('consistency-grid').props.accessibilityLabel).toBe(t('progress.consistency.spoken', { count: 2, onTrack: 1, spare: 1, paused: 0, other: 0 }));
  });

  test('the muscles still show (the sets-per-muscle bars come next)', async () => {
    await show();
    expect(screen.getByText(t('progress.muscles.title'))).toBeOnTheScreen();
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

describe('privacy (V1): nothing written, nothing about a photo, leaves the phone from this tab', () => {
  const KNOWN = [
    'GET /v1/training-progress',
    'GET /v1/consistency',
    'GET /v1/weigh-ins/summary',
    'GET /v1/days/{day}/budget 2026-10-15',
    'GET /v1/program',
    'GET /v1/targets/starting',
    'GET /v1/first-weeks',
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
