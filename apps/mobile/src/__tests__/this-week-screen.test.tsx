/**
 * This week (K-969, ADR-077 #1, prototype #home and #home-mon): the week strip under the week's number and record, one
 * hero block, then today. The week, its number, the call's day and the days to it are the server's (ADR-077 Ek 2); the
 * phone lays them out. First week, an ordinary week, Monday with the check-in open, a call declined, no consent.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

// An ordinary week: week 13 of the record, Friday 25 Dec 2026; the week began Monday 21 Dec.
const CONSISTENCY: Schemas['Consistency'] = {
  weekOf: '2026-12-21',
  training: { planned: 3, done: 2 },
  protein: { planned: 4, done: 3 },
  steps: { planned: 5, done: 5 },
  weighIns: { planned: 7, done: 6 },
  planned: 19,
  done: 16,
  percent: 84,
  record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
};
const decision = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-21',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [{ rule: 'plateau', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-12-28',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
  ...extra,
});
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'programDays.full_body_a.name', weekday: 'MONDAY', exercises: [] },
    { id: 'b', nameKey: 'programDays.full_body_b.name', weekday: 'WEDNESDAY', exercises: [] },
    { id: 'c', nameKey: 'programDays.full_body_a.name', weekday: 'FRIDAY', exercises: [] },
  ],
  week: [
    { programDayId: 'a', date: '2026-12-21', exerciseIds: [] },
    { programDayId: 'b', date: '2026-12-23', exerciseIds: [] },
    { programDayId: 'c', date: '2026-12-25', exerciseIds: [] },
  ],
};
const WORKOUTS: Schemas['Workout'][] = [
  { id: 'w1', clientId: 'c1', startedAt: '2026-12-21T12:00:00Z', endedAt: '2026-12-21T13:00:00Z', programDayId: 'a', sets: [] },
  { id: 'w2', clientId: 'c2', startedAt: '2026-12-23T12:00:00Z', endedAt: '2026-12-23T13:00:00Z', programDayId: 'b', sets: [] },
];
const WEIGH_INS = [{ id: 'x', clientId: 'cx', measuredAt: '2026-12-22T07:00:00Z', kg: 80.3, source: 'MANUAL' }];

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockPost: Answer = ok({});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => mockPost);
const mockPush = jest.fn();
// The screen read again on focus, as expo-router does each time it comes into view.
let mockRefocus: () => void = () => {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      mockRefocus = effect;
      effect();
    }, [effect]);
  },
}));
const mockServices = {
  api: { GET: mockGET, POST: mockPOST },
  syncHealth: jest.fn(async () => 0),
  queue: { drain: jest.fn(async () => {}) },
  report: () => {},
  reminders: { keepRestUntil: jest.fn(async () => {}), keepFirstCall: jest.fn(async () => {}), era: () => 0 },
  state: { keep: jest.fn(async () => {}), back: jest.fn(async () => {}) },
  opens: { previous: async () => null },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
}));

const REAL = [
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
] as const;
/** The phone's clock: only the date is fake, timers are real. */
const onPhone = (now: Date) => jest.useFakeTimers({ now, doNotFake: [...REAL] });
afterAll(() => jest.useRealTimers());

function ordinaryWeek() {
  onPhone(new Date(2026, 11, 25, 9, 0)); // Friday 25 Dec 2026, morning
  mockAnswers = {
    '/v1/consistency': ok(CONSISTENCY),
    '/v1/decisions/current': ok(decision()),
    '/v1/program': ok(PROGRAM),
    '/v1/workouts': ok(WORKOUTS),
    '/v1/weigh-ins': ok(WEIGH_INS),
    '/v1/first-weeks': refused(404, 'NOT_FOUND'),
  };
}
function firstWeek() {
  onPhone(new Date(2026, 9, 12, 9, 0)); // Monday 12 Oct 2026: onboarding finished today
  mockAnswers = {
    '/v1/consistency': refused(404, 'NOT_FOUND'),
    '/v1/decisions/current': refused(404, 'NOT_FOUND'),
    '/v1/program': ok({ ...PROGRAM, week: [{ programDayId: 'b', date: '2026-10-14', exerciseIds: [] }, { programDayId: 'c', date: '2026-10-16', exerciseIds: [] }] }),
    '/v1/workouts': ok([]),
    '/v1/weigh-ins': ok([]),
    '/v1/first-weeks': ok({ week: 1, risk: [], readsRisk: false, training: true, firstCallOn: '2026-10-19' }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPost = ok({});
  ordinaryWeek();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <TodayScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
// The first render compiles what it draws: paid once here, under its own budget (as today-screen.test.tsx).
beforeAll(async () => {
  ordinaryWeek();
  await show();
  await screen.unmount();
}, 30_000);
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const day = (date: string) => screen.getByTestId(`day-${date}`).props.accessibilityLabel as string;

describe('an ordinary week', () => {
  test("the strip: the server's week, Monday to Sunday; trained ✓, logged, planned; an empty day says nothing", async () => {
    await show();
    expect(screen.getByText(t('thisWeek.onTrack', { onTrack: 11, counted: 12 }))).toBeOnTheScreen();
    expect(day('2026-12-21')).toBe('Monday, trained');
    expect(day('2026-12-22')).toBe('Tuesday, logged');
    expect(day('2026-12-24')).toBe('Thursday');
    expect(day('2026-12-25')).toBe('Friday, planned, today');
    expect(day('2026-12-27')).toBe('Sunday');
    // The week the server counted: the workouts and weigh-ins from its Monday to today.
    expect(mockGET).toHaveBeenCalledWith('/v1/workouts', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
    expect(mockGET).toHaveBeenCalledWith('/v1/weigh-ins', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
  });

  test("the hero: the call's label and one line, the next call's day and the days to it, from the server's date", async () => {
    await show();
    expect(screen.getByText(t('thisWeek.hero.call'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.nextCall', { day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.inDays', { count: 3 }))).toBeOnTheScreen();
  });

  test('the next call tomorrow and today are said so', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ nextReview: '2026-12-26' }));
    await show();
    expect(screen.getByText(t('thisWeek.hero.nextCall', { day: 'Saturday' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.tomorrow'))).toBeOnTheScreen();
  });

  test("no week number once the first eight weeks are over: the server names none, and none is made up", async () => {
    await show();
    expect(screen.queryByText(/^Week \d+$/)).toBeNull();
  });

  test("the call's details open in place (the call screen is K-978's); nothing retired opens", async () => {
    await show();
    expect(screen.queryByTestId('call')).toBeNull();
    await press(t('thisWeek.hero.openCall'));
    expect(screen.getByTestId('call')).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.body'))).toBeOnTheScreen();
    await press(t('thisWeek.hero.hideCall'));
    expect(screen.queryByTestId('call')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('one hero, no more (ADR-077 #1): no consistency card, no first weeks card, no coach questions, no chips', async () => {
    mockAnswers['/v1/prompts'] = ok([{ rule: 'missed_sessions', occurrence: '2026-12-21', questionKey: 'prompt.missed_sessions', answers: [] }]);
    await show();
    expect(screen.queryByText(t('today.consistency.title'))).toBeNull();
    expect(screen.queryByText(t('today.consistency.percent', { percent: 84 }))).toBeNull();
    expect(screen.queryByText(t('today.state.declare'))).toBeNull();
    expect(screen.queryByText(t('today.chips.why'))).toBeNull();
    expect(screen.getAllByTestId('hero')).toHaveLength(1);
  });

  test('Settings is the top right corner, one tap', async () => {
    await show();
    await press(t('thisWeek.settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});

describe("the first week (ADR-077 #1, Ek 2)", () => {
  beforeEach(firstWeek);

  test('"Week 1 · Counted by week"; the week from the program\'s sessions; nothing done yet, nothing red', async () => {
    await show();
    expect(screen.getByText(t('thisWeek.week', { week: 1 }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.countedByWeek'))).toBeOnTheScreen();
    expect(day('2026-10-12')).toBe('Monday, today');
    expect(day('2026-10-14')).toBe('Wednesday, planned');
    expect(mockGET).toHaveBeenCalledWith('/v1/workouts', { params: { query: { from: '2026-10-12', to: '2026-10-12' } } });
  });

  test('the hero: "First week · Weigh in most mornings · First call Monday, 7 days", the day the server named', async () => {
    await show();
    expect(screen.getByText(t('thisWeek.hero.start'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.firstWeek'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.weighIn'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.firstCall', { day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.inDays', { count: 7 }))).toBeOnTheScreen();
  });
});

describe('Monday, the check-in open (#home-mon)', () => {
  beforeEach(() => {
    onPhone(new Date(2026, 11, 28, 8, 0)); // Monday 28 Dec 2026
    mockAnswers['/v1/consistency'] = ok({ ...CONSISTENCY, weekOf: '2026-12-28' });
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [{ kind: 'HUNGER' }], answered: false });
  });

  test('"Open your call": the call is ready, one question first; the tap opens the check-in', async () => {
    mockAnswers['/v1/first-weeks'] = ok({ week: 4, risk: [], readsRisk: false, training: true, contentKey: 'first_weeks.week4' });
    await show();
    expect(screen.getByText(t('onboarding.schedule.dayName.MONDAY'))).toBeOnTheScreen();
    expect(screen.getAllByText(t('thisWeek.week', { week: 4 })).length).toBeGreaterThan(0);
    expect(screen.getByText(`${t('thisWeek.hero.monday.ready', { week: 4 })} ${t('thisWeek.hero.monday.one')}`)).toBeOnTheScreen();
    await press(t('thisWeek.hero.monday.openLabel'));
    expect(mockPush).toHaveBeenCalledWith('/check-in');
    // Last week's call waits behind the check-in: one hero.
    expect(screen.queryByText(t('decision.stop_load_increase.label'))).toBeNull();
  });

  test('two questions, said as two; past the first eight weeks, no week number', async () => {
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [{ kind: 'HUNGER' }, { kind: 'SLEEP' }], answered: false });
    await show();
    expect(screen.getByText(`${t('thisWeek.hero.monday.readyNoWeek')} ${t('thisWeek.hero.monday.other', { count: 2 })}`)).toBeOnTheScreen();
  });

  test('answered: the new call is the hero again', async () => {
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [], answered: true });
    await show();
    expect(screen.queryByRole('button', { name: t('thisWeek.hero.monday.openLabel') })).toBeNull();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
  });
});

describe("a call declined: last week's plan kept (K-963, user test 8 Oct)", () => {
  beforeEach(() => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'DECLINED' } }));
  });

  test('"Not applied · Use this call": one tap uses the call after all, and the week reads again', async () => {
    await show();
    expect(screen.getByText(t('thisWeek.hero.notApplied'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.notAppliedShort'))).toBeOnTheScreen();
    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('thisWeek.hero.useCall'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/apply', { params: { path: { id: 'd1' } } });
    expect(screen.queryByText(t('thisWeek.hero.notApplied'))).toBeNull();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.title'))).toBeOnTheScreen();
  });

  test('not used (no connection): said so, and the button stays', async () => {
    mockPOST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await show();
    await press(t('thisWeek.hero.useCall'));
    expect(screen.getByText(t('today.call.applyFailed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('thisWeek.hero.useCall') })).toBeOnTheScreen();
  });

  test('not used is said for that read only: read again, the call is a new try', async () => {
    mockPOST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await show();
    await press(t('thisWeek.hero.useCall'));
    expect(screen.getByText(t('today.call.applyFailed'))).toBeOnTheScreen();
    // Each read is parsed anew: the same call, a new object.
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'DECLINED' } }));
    await act(async () => mockRefocus());
    expect(screen.queryByText(t('today.call.applyFailed'))).toBeNull();
    expect(screen.getByRole('button', { name: t('thisWeek.hero.useCall') })).toBeOnTheScreen();
  });
});

describe('without the health data consent (ADR-072 Ek 1: no consent, no line)', () => {
  beforeEach(() => {
    for (const path of ['/v1/consistency', '/v1/decisions/current', '/v1/first-weeks', '/v1/weigh-ins', '/v1/days/{day}/budget']) {
      mockAnswers[path] = refused(403, 'CONSENT_REQUIRED');
    }
  });

  test('the calls are off, with the way to Settings; no record, no "Counted by week"', async () => {
    await show();
    expect(screen.getByText(t('thisWeek.hero.callsOff'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.train'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.countedByWeek'))).toBeNull();
    expect(screen.queryByText(/weeks on track/)).toBeNull();
    await press(t('thisWeek.hero.settingsLabel'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    // The training still shows on the strip: it is not health data.
    expect(day('2026-12-21')).toBe('Monday, trained');
  });
});

describe('a week paused (K-518): the state is the hero', () => {
  test("its card with \"I'm back\"; no call block", async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'BUSY', since: '2026-12-22' });
    await show();
    expect(screen.getByRole('button', { name: t('today.state.back') })).toBeOnTheScreen();
    expect(screen.queryByTestId('hero')).toBeNull();
  });

  test('the check-in open in a paused week: "Open your call" under the state\'s card, so the pause can end there', async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'BUSY', since: '2026-12-22' });
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [{ kind: 'STATE_STILL' }], answered: false });
    await show();
    expect(screen.getByRole('button', { name: t('today.state.back') })).toBeOnTheScreen();
    await press(t('thisWeek.hero.monday.openLabel'));
    expect(mockPush).toHaveBeenCalledWith('/check-in');
  });
});
