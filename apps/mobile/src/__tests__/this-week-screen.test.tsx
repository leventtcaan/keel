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
  today: '2026-12-25',
  weekOf: '2026-12-21',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'programDays.full_body_a.name', weekday: 'MONDAY', exercises: [] },
    { id: 'b', nameKey: 'programDays.full_body_b.name', weekday: 'WEDNESDAY', exercises: [] },
    {
      id: 'c',
      nameKey: 'programDays.full_body_a.name',
      weekday: 'FRIDAY',
      exercises: [
        { exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 80, nextReps: 8 },
        { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 72.5, nextReps: 9 },
        { exerciseId: 'lat_pulldown', baseSets: 3, sets: 3, reps: { min: 8, max: 12 }, targetRir: 1 },
        { exerciseId: 'plank', baseSets: 2, sets: 2, reps: { min: 30, max: 60 }, targetRir: 1 },
      ],
    },
  ],
  cardio: {
    source: 'GENERATED',
    minutes: 30,
    sessionsPerWeek: 3,
    sessions: [{ weekday: 'FRIDAY', place: 'AFTER_LIFT' }],
    doneThisWeek: 1,
    afterLiftOverLine: false,
  },
  week: [
    { programDayId: 'a', date: '2026-12-21', exerciseIds: [] },
    { programDayId: 'b', date: '2026-12-23', exerciseIds: [] },
    { programDayId: 'c', date: '2026-12-25', exerciseIds: ['squat', 'bench_press', 'lat_pulldown', 'plank'] },
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
  // The phone's own records: a workout under way (K-405, K-961).
  workoutRecords: jest.fn(async (): Promise<unknown[]> => []),
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
    '/v1/program': ok({ ...PROGRAM, today: '2026-10-12', weekOf: '2026-10-12', week: [{ programDayId: 'b', date: '2026-10-14', exerciseIds: [] }, { programDayId: 'c', date: '2026-10-16', exerciseIds: [] }] }),
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
    expect(screen.getByRole('button', { name: t('thisWeek.hero.openCall') })).toBeOnTheScreen(); // the label is the block's head, no eyebrow (word budget)
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

  test('the check-in open in a paused week: "Open your call", one block; the check-in asks whether the state still holds', async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'BUSY', since: '2026-12-22' });
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [{ kind: 'STATE_STILL' }], answered: false });
    await show();
    expect(screen.queryByRole('button', { name: t('today.state.back') })).toBeNull();
    await press(t('thisWeek.hero.monday.openLabel'));
    expect(mockPush).toHaveBeenCalledWith('/check-in');
  });
});

const BUDGET = (low: number, high: number): Schemas['DayBudget'] => ({
  day: '2026-12-25',
  targetKcal: 2300,
  eaten: { kcal: { low: 0, high: 0 }, proteinG: { low: 0, high: 0 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
  left: { kcal: { low, high }, proteinG: { low: 60, high: 80 } },
});
const FRIDAY_MOVES = ['squat', 'bench_press', 'lat_pulldown', 'plank'];
const fridayAs = (extra: Partial<Schemas['WeekSession']>) =>
  ok({ ...PROGRAM, week: [...(PROGRAM.week ?? []).slice(0, 2), { programDayId: 'c', date: '2026-12-25', exerciseIds: FRIDAY_MOVES, ...extra }] });
const startFullBodyA = () => t('thisWeek.today.startLabel', { session: t('programDays.full_body_a.name') });
const record = (seq: number, kind: string, clientId: string, parentClientId: string | null, body: unknown) => ({
  seq,
  clientId,
  kind,
  parentClientId,
  body,
  state: 'PENDING',
  serverId: null,
  serverBody: null,
  errorCode: null,
});

describe("today's workout (#home)", () => {
  test('the first three moves with their targets, the cardio line, Start; the fourth waits in the session', async () => {
    await show();
    expect(screen.getByText(t('programDays.full_body_a.name'))).toBeOnTheScreen();
    expect(screen.getByText(t('exercises.squat.name'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.target', { load: 80, reps: 8 }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.target', { load: 72.5, reps: 9 }))).toBeOnTheScreen();
    expect(screen.getByText(t('train.setsReps', { sets: 3, reps: '8-12' }))).toBeOnTheScreen(); // no target yet
    expect(screen.queryByTestId('move-plank')).toBeNull();
    expect(screen.getByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeOnTheScreen();
    await press(startFullBodyA());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'c' } });
  });

  test('"Change" opens the page that changes today (K-970), for today\'s session', async () => {
    await show();
    await press(t('thisWeek.today.changeLabel'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/today-change', params: { day: 'c' } });
  });

  test('a bodyweight move says its sets and reps, never "0 ×"; an added load has its plus (the session\'s own rule)', async () => {
    const move = (id: string, load: Schemas['Exercise']['load']) =>
      ({ id, nameKey: `exercises.${id}.name`, kind: 'COMPOUND', muscles: [], alternatives: [], load, equipment: 'BODYWEIGHT', unilateral: false, setupFields: [] }) as Schemas['Exercise'];
    mockAnswers['/v1/exercises'] = ok([move('pull_up', 'BODYWEIGHT_PLUS_EXTERNAL'), move('dip', 'BODYWEIGHT_PLUS_EXTERNAL'), move('push_up', 'BODYWEIGHT')]);
    const planned = (exerciseId: string, nextLoadKg: number) => ({ exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg, nextReps: 7 });
    mockAnswers['/v1/program'] = ok({
      ...PROGRAM,
      days: [...PROGRAM.days.slice(0, 2), { ...PROGRAM.days[2], exercises: [planned('pull_up', 0), planned('dip', 10), planned('push_up', 0)] }],
      week: [...(PROGRAM.week ?? []).slice(0, 2), { programDayId: 'c', date: '2026-12-25', exerciseIds: ['pull_up', 'dip', 'push_up'] }],
    });
    await show();
    expect(screen.getAllByText(t('train.setsReps', { sets: 3, reps: 7 }))).toHaveLength(2); // the pull-up and the push-up
    expect(screen.getByText(t('thisWeek.today.added', { load: 10, reps: 7 }))).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/"0 ×/);
  });

  test('the short version shows on the card: "Full workout" takes it back (FULL, K-995), cardio optional', async () => {
    mockAnswers['/v1/program'] = fridayAs({ short: true, exerciseIds: FRIDAY_MOVES.slice(0, 3) });
    await show();
    expect(screen.getByText(t('thisWeek.today.cardioOptional'))).toBeOnTheScreen();
    mockPost = ok(PROGRAM);
    mockAnswers['/v1/program'] = ok(PROGRAM);
    await press(t('thisWeek.today.full'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'c', change: 'FULL' } });
    expect(screen.getByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeOnTheScreen(); // read again: the full session
  });

  test("moved: today is rest, and the card says where the session went (the server's day)", async () => {
    mockAnswers['/v1/program'] = fridayAs({ date: '2026-12-26', moved: true });
    await show();
    expect(screen.getByText(t('thisWeek.today.rest'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.movedTo', { day: 'Saturday' }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    expect(day('2026-12-26')).toBe('Saturday, planned');
    expect(screen.queryByRole('button', { name: t('thisWeek.today.undo') })).toBeNull(); // the server says it cannot be undone
  });

  test('moved today and undoable: "Undo" on the card puts the week back (UNDO, K-995)', async () => {
    mockAnswers['/v1/program'] = fridayAs({ date: '2026-12-26', moved: true, movedFrom: '2026-12-25', undoable: true });
    await show();
    mockPost = ok(PROGRAM);
    mockAnswers['/v1/program'] = ok(PROGRAM);
    await press(t('thisWeek.today.undo'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'c', change: 'UNDO' } });
    expect(screen.getByRole('button', { name: startFullBodyA() })).toBeOnTheScreen();
  });

  test('skipped today and undoable: "Undo"; not undone (no connection), said so and the button stays', async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true, undoable: true });
    await show();
    mockPOST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await press(t('thisWeek.today.undo'));
    expect(screen.getByText(t('todayChange.offline'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('thisWeek.today.undo') })).toBeOnTheScreen();
  });

  test("refused (409: today's workout started): the server's not now, said so", async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true, undoable: true });
    await show();
    mockPost = refused(409, 'CONFLICT');
    await press(t('thisWeek.today.undo'));
    expect(screen.getByText(t('todayChange.started'))).toBeOnTheScreen();
  });

  test('skipped: said so with the check-in day the user has, no Start, nothing planned in its place', async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true });
    mockAnswers['/v1/profile'] = ok({ schedule: { trainingDays: ['MONDAY'], checkInDay: 'SUNDAY', timeZone: 'Europe/Istanbul' } });
    await show();
    expect(screen.getByText(t('thisWeek.today.skipped', { day: 'Sunday' }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    expect(day('2026-12-25')).toBe('Friday, today');
  });

  test("done today (the server's DONE, K-995): the day ticked, no Start, 'N sets · X kg lifted' from its summary", async () => {
    mockAnswers['/v1/workouts'] = ok([
      ...WORKOUTS,
      { id: 'w3', clientId: 'c3', startedAt: '2026-12-25T08:00:00Z', endedAt: '2026-12-25T09:00:00Z', programDayId: 'c', sets: [] },
    ]);
    mockAnswers['/v1/program'] = fridayAs({ workout: { id: 'w3', state: 'DONE' } });
    mockAnswers['/v1/workouts/{id}/summary'] = ok({ workoutId: 'w3', liftedKg: 8420, workingSets: 14, marks: [], weekOf: '2026-12-21', muscles: [] });
    await show();
    expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.doneStats.other', { count: 14, lifted: '8,420 kg' }))).toBeOnTheScreen();
    expect(mockGET).toHaveBeenCalledWith('/v1/workouts/{id}/summary', { params: { path: { id: 'w3' } } });
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    expect(day('2026-12-25')).toBe('Friday, trained, today');
  });

  test('under way, but not on this phone (the server\'s OPEN): "Open workout", no Start, nothing to continue here', async () => {
    mockAnswers['/v1/program'] = fridayAs({ workout: { id: 'w4', state: 'OPEN' } });
    await show();
    expect(screen.getByText(t('thisWeek.today.open'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.openElsewhere'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.today.continue') })).toBeNull();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
  });

  test('finished offline (its finish still waiting on the phone): done, no Start again', async () => {
    mockServices.workoutRecords.mockResolvedValueOnce([
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'c' }),
      record(2, 'set', 's1', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
      record(3, 'finish', 'f1', 'wo', { endedAt: '2026-12-25T09:00:00Z', uncleanExerciseIds: [] }),
    ]);
    await show();
    expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
  });

  test('a workout left open: "Open workout · Continue" back into it, with the sets logged', async () => {
    mockServices.workoutRecords.mockResolvedValueOnce([
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'c' }),
      record(2, 'set', 's1', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
      record(3, 'set', 's2', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
    ]);
    await show();
    expect(screen.getByText(t('thisWeek.today.open'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.openSets.other', { count: 2 }))).toBeOnTheScreen();
    await press(t('thisWeek.today.continue'));
    expect(mockPush).toHaveBeenCalledWith('/workout');
  });
});

describe('the food line', () => {
  const range = (low: string | number, high: string | number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;

  test('"Food left" as a range, and the whole line opens the meal', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(1240, 1480));
    await show();
    expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
    expect(screen.getByText(range('1,240', '1,480'))).toBeOnTheScreen();
    await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.left'), amount: range('1,240', '1,480') }));
    expect(mockPush).toHaveBeenCalledWith('/meal');
  });

  test("a meal logged, the range comes down: the server's numbers as they are", async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(610, 720));
    await show();
    expect(screen.getByText(range(610, 720))).toBeOnTheScreen();
  });

  test('without the health data consent: the lock line in its place, Allow leads to the consent', async () => {
    mockAnswers['/v1/days/{day}/budget'] = refused(403, 'CONSENT_REQUIRED');
    await show();
    expect(screen.queryByText(t('thisWeek.food.left'))).toBeNull();
    expect(screen.getByText(t('thisWeek.food.locked'))).toBeOnTheScreen();
    await press(t('thisWeek.food.allowLabel'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  test('the first week, no budget yet: the starting target as "Food today", one number, and Log (prototype foodLine)', async () => {
    mockAnswers['/v1/targets/starting'] = ok({ targetKcal: 2100, maintenanceKcal: { low: 2000, high: 2200 }, observationDays: 14 });
    await show();
    expect(screen.getByText(t('thisWeek.food.today'))).toBeOnTheScreen();
    expect(screen.getByText(t('food.budget.single', { value: '2,100', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
    await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.today'), amount: '2,100 kcal' }));
    expect(mockPush).toHaveBeenCalledWith('/meal');
  });

  test('no budget and no starting target either: no line', async () => {
    await show();
    expect(screen.queryByTestId('food-line')).toBeNull();
    expect(screen.queryByTestId('food-locked')).toBeNull();
  });
});
