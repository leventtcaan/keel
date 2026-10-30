/**
 * This week (K-969, ADR-077 #1, prototype #home and #home-mon): the week strip under the week's number and record, one
 * hero block, then today. The week, its number, the call's day and the days to it are the server's (ADR-077 Ek 2); the
 * phone lays them out. First week, an ordinary week, Monday with the check-in open, a call declined, no consent.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import TodayScreen from '@/app/(tabs)/index';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { PLUS_GUTTER } from '@/components/PlusEntry';
import { GuideProvider } from '@/guide/GuideProvider';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';
import { weekRecordText } from '@/today/week';
import { workoutParams } from '@/train/params';

import { Saver, WithSaved, banner, publishSave, undoButton } from './support/saved';

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
  weeks: [],
};
const decision = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-21',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [{ rule: 'plateau', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2027-01-04',
  nextCallOn: '2026-12-28',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
  changes: [],
  ...extra,
});
const CALORIES_CHANGE: Schemas['DecisionChange'] = { what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 } };
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
let mockDeleteAnswer: Answer | 'offline' = { response: new Response(null, { status: 204 }) };
const mockDELETE = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockDeleteAnswer === 'offline') throw new TypeError('Network request failed');
  return mockDeleteAnswer;
});
const mockAdopt = jest.fn(async (_workout: Schemas['Workout']) => {});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => mockPost);
const mockPush = jest.fn();
const mockNavigate = jest.fn();
// The screen read again on focus, as expo-router does each time it comes into view.
let mockRefocus: () => void = () => {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: (...args: unknown[]) => mockNavigate(...args) },
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
  api: { GET: mockGET, POST: mockPOST, DELETE: mockDELETE },
  adoptWorkout: (workout: Schemas['Workout']) => mockAdopt(workout),
  syncHealth: jest.fn(async () => 0),
  queue: { drain: jest.fn(async () => {}) },
  report: () => {},
  reminders: { keepRestUntil: jest.fn(async () => {}), keepFirstCall: jest.fn(async () => {}), keepWeighInWeek: jest.fn(async () => {}), era: () => 0 },
  state: { keep: jest.fn(async () => {}), back: jest.fn(async () => {}) },
  opens: { previous: async () => null },
  // The phone's own records: a workout under way (K-405, K-961).
  workoutRecords: jest.fn(async (): Promise<unknown[]> => []),
  // The program the Train tab keeps for offline (K-405): none unless a test keeps one.
  training: { keptProgram: jest.fn(async (): Promise<Schemas['Program'] | null> => null) },
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
  mockServices.training.keptProgram.mockImplementation(async () => null);
  mockPost = ok({});
  mockDeleteAnswer = { response: new Response(null, { status: 204 }) };
  ordinaryWeek();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <TodayScreen />
      </WithSaved>
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
// The hero as a screen reader meets it: the call's label and its line are what it reads, "Open the call" is its hint (user test 10 Oct review).
const heroSpoken = `${t('decision.stop_load_increase.label')}. ${t('decision.stop_load_increase.plateau.title')}`;
const hero = () => screen.getByRole('button', { name: heroSpoken });

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
    expect(hero()).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.nextCall', { day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.inDays', { count: 3 }))).toBeOnTheScreen();
  });

  // K-1048: no empty band over the title. The arrow is the block's mark, not a control, so it is the height of its glyph, not of a
  // touch target; the prototype's "This week's call" label is left out to hold the home first view to 40 words (ADR-069 #4).
  test("the hero's top row is only as tall as the arrow: it reserves no touch target's height, and no empty text is laid out beside it", async () => {
    await show();
    const hero = within(screen.getByTestId('hero'));
    const mark = hero.getByTestId('decision-mark');
    const style = StyleSheet.flatten(mark.props.style);
    expect(style.minHeight).toBeUndefined();
    expect(style.minWidth).toBeUndefined();
    // The row holds the arrow and a plain spacer, not an empty label.
    expect(StyleSheet.flatten(mark.parent?.props.style)).toMatchObject({ flexDirection: 'row' });
    expect(hero.queryByText(t('today.call.eyebrow'))).toBeNull();
    expect(hero.queryByText('')).toBeNull();
    // The call's label is the block's title, directly under the row.
    expect(hero.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
  });

  test('the next call tomorrow and today are said so', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ nextCallOn: '2026-12-26' }));
    await show();
    expect(screen.getByText(t('thisWeek.hero.nextCall', { day: 'Saturday' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.hero.tomorrow'))).toBeOnTheScreen();
  });

  test("no week number once the first eight weeks are over: the server names none, and none is made up", async () => {
    await show();
    expect(screen.queryByText(/^Week \d+$/)).toBeNull();
  });

  test('the call opens on its own screen (K-978), by navigating: a second tap goes to the same screen, not a second one', async () => {
    await show();
    const chevron = hero();
    await act(async () => {
      fireEvent.press(chevron);
      fireEvent.press(chevron);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/call');
    expect(mockPush).not.toHaveBeenCalled(); // nothing retired opens, and no stack of calls
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
    expect(within(screen.getByTestId('hero')).getByText(t('thisWeek.hero.today'))).toBeOnTheScreen();
    expect(screen.getAllByText(t('thisWeek.week', { week: 4 })).length).toBeGreaterThan(0);
    expect(screen.getByText(`${t('thisWeek.hero.monday.ready', { week: 4 })} ${t('thisWeek.hero.monday.one')}`)).toBeOnTheScreen();
    await press(t('thisWeek.hero.monday.openLabel'));
    expect(mockPush).toHaveBeenCalledWith('/check-in');
    // Last week's call waits behind the check-in: one hero.
    expect(screen.queryByText(t('decision.stop_load_increase.label'))).toBeNull();
  });

  test('back after a gap: the check-in is open, so the hero says Today, never the earlier day the check-in week is named by (B15)', async () => {
    onPhone(new Date(2026, 11, 31, 8, 0)); // Thursday 31 Dec 2026, check-in day Monday
    mockAnswers['/v1/check-ins/current'] = ok({ weekOf: '2026-12-28', questions: [{ kind: 'HUNGER' }], answered: false });
    await show();
    expect(within(screen.getByTestId('hero')).getByText(t('thisWeek.hero.today'))).toBeOnTheScreen();
    expect(screen.queryByText(t('onboarding.schedule.dayName.MONDAY'))).toBeNull();
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

describe('the hero is one tap (user test 10 Oct)', () => {
  test("the whole block opens the call: its label, its line and the next call's day, not only the arrow", async () => {
    await show();
    for (const text of [t('decision.stop_load_increase.label'), t('decision.stop_load_increase.plateau.title'), t('thisWeek.hero.nextCall', { day: 'Monday' })]) {
      mockNavigate.mockClear();
      await act(async () => {
        fireEvent.press(screen.getByText(text));
      });
      expect(mockNavigate).toHaveBeenCalledWith('/call');
    }
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('a screen reader reads the call, not only "Open the call": its label and its line are the name, the hint says what the tap does', async () => {
    await show();
    expect(screen.getByHintText(t('thisWeek.hero.openCall'))).toBe(hero());
    expect(screen.queryByRole('button', { name: t('thisWeek.hero.openCall') })).toBeNull();
  });

  test('a call not applied yet is read with its line too, and its action stays a button of its own', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' } }));
    await show();
    expect(hero()).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('thisWeek.hero.useCall') })).toBeOnTheScreen();
  });

  test('the block is one control to a screen reader (the arrow is its mark, not a second button)', async () => {
    await show();
    expect(screen.getAllByRole('button', { name: heroSpoken })).toHaveLength(1);
    expect(screen.getAllByHintText(t('thisWeek.hero.openCall'))).toHaveLength(1);
  });

  test('a call not applied yet (pending): it says so, with the one action that applies it; the whole block still opens the call', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' } }));
    await show();
    expect(screen.getByText(t('thisWeek.hero.pending'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.title'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.hero.nextCall', { day: 'Monday' }))).toBeNull(); // one action in the foot, not two things to read
    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('thisWeek.hero.useCall'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/apply', { params: { path: { id: 'd1' } } });
    expect(screen.queryByText(t('thisWeek.hero.pending'))).toBeNull();
    expect(screen.getByText(t('thisWeek.hero.nextCall', { day: 'Monday' }))).toBeOnTheScreen();
  });

  test('"Use this call" is not silent: the banner says the call is applied and what moved, and Undo takes the call back', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' }, changes: [CALORIES_CHANGE] }));
    await show();
    expect(banner()).toBeNull();
    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('thisWeek.hero.useCall'));
    expect(screen.getByText(t('today.call.appliedLead'))).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.changes.spoken', { what: t('callScreen.changes.label.CALORIES'), from: t('callScreen.changes.kcal', { kcal: '2,100' }), to: t('callScreen.changes.kcal', { kcal: '1,850' }) }))).toBeOnTheScreen();
    await act(async () => fireEvent.press(undoButton()));
    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/undo', { params: { path: { id: 'd1' } } });
  });

  test('a call that did not apply (no connection) has no banner', async () => {
    mockPOST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' } }));
    await show();
    await press(t('thisWeek.hero.useCall'));
    expect(banner()).toBeNull();
  });

  test('the action on a call not applied is its own control: pressing it does not open the call', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' } }));
    await show();
    await press(t('thisWeek.hero.useCall'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('a call in the plan has no "Use this call"', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('thisWeek.hero.useCall') })).toBeNull();
    expect(screen.queryByText(t('thisWeek.hero.pending'))).toBeNull();
  });
});

describe("a call declined: last week's plan kept (K-963, user test 8 Oct)", () => {
  beforeEach(() => {
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'DECLINED' } }));
  });

  test('"Use this call" on a call the user kept off the plan is the quiet kind of button (U2), on a pending one the primary', async () => {
    const p = palettes.light;
    await show();
    expect(screen.getByRole('button', { name: t('thisWeek.hero.useCall') })).not.toHaveStyle({ backgroundColor: p.accentInk });
    await screen.unmount();
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'PENDING' } }));
    await show();
    expect(screen.getByRole('button', { name: t('thisWeek.hero.useCall') })).toHaveStyle({ backgroundColor: p.accentInk });
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

describe('an account with no program (K-1037, ADR-084)', () => {
  beforeEach(() => {
    mockAnswers['/v1/program'] = refused(404, 'NOT_FOUND');
  });

  test("the training card's place has the way out: the line and Build my program, which opens the days question", async () => {
    await show();
    expect(screen.getByText(t('buildProgram.line'))).toBeOnTheScreen();
    await press(t('buildProgram.action'));
    expect(mockPush).toHaveBeenCalledWith('/build-program');
    // The program is read once, as before: the card learns from the week's own read.
    expect(mockGET.mock.calls.filter(([path]) => path === '/v1/program')).toHaveLength(1);
  });

  test('a program that could not be read (offline) is not a missing one: no Build my program', async () => {
    mockAnswers['/v1/program'] = 'offline';
    await show();
    expect(screen.queryByText(t('buildProgram.action'))).toBeNull();
  });

  test('with a program, the card is the training card and there is no Build my program', async () => {
    mockAnswers['/v1/program'] = ok(PROGRAM);
    await show();
    expect(screen.queryByText(t('buildProgram.action'))).toBeNull();
    expect(screen.getByTestId('today-card')).toBeOnTheScreen();
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
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'consent' } });
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
  targetProteinG: 140,
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

  test('cardio logged today: the line reads as done, not the plan again (K-1029, Tour 4 B13)', async () => {
    mockAnswers['/v1/program'] = ok({
      ...PROGRAM,
      cardio: {
        ...PROGRAM.cardio,
        doneThisWeek: 2,
        loggedDays: ['2026-12-23', '2026-12-25'],
        loggedToday: { id: 's1', clientId: 'c1', day: '2026-12-25', minutes: 25, source: 'MANUAL' },
      },
    });
    await show();
    expect(screen.getByText(t('thisWeek.today.cardioDone'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeNull();
  });

  test('cardio logged today, the record not at hand (only the logged days): it still reads as done', async () => {
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, cardio: { ...PROGRAM.cardio, doneThisWeek: 2, loggedDays: ['2026-12-25'] } });
    await show();
    expect(screen.getByText(t('thisWeek.today.cardioDone'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeNull();
  });

  test('cardio logged on another day: today still shows the plan', async () => {
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, cardio: { ...PROGRAM.cardio, doneThisWeek: 2, loggedDays: ['2026-12-23'] } });
    await show();
    expect(screen.getByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeOnTheScreen();
  });

  test('the moves beyond the first three are counted ("and 1 more"), so the card and the Train tab tell the same session (user test 10 Oct)', async () => {
    await show();
    expect(screen.getByText('and 1 more')).toBeOnTheScreen();
    mockAnswers['/v1/program'] = fridayAs({ exerciseIds: ['squat', 'bench_press', 'lat_pulldown'] });
    await act(async () => mockRefocus());
    expect(screen.queryByText(/and \d+ more/)).toBeNull();
  });

  test('ten moves: three shown and "and 7 more"', async () => {
    const ten = ['squat', 'bench_press', 'lat_pulldown', 'plank', 'row', 'curl', 'dip', 'lunge', 'fly', 'raise'];
    mockAnswers['/v1/program'] = ok({
      ...PROGRAM,
      days: [...PROGRAM.days.slice(0, 2), { ...PROGRAM.days[2], exercises: ten.map((id) => ({ exerciseId: id, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 })) }],
      week: [...(PROGRAM.week ?? []).slice(0, 2), { programDayId: 'c', date: '2026-12-25', exerciseIds: ten }],
    });
    await show();
    expect(screen.getByText('and 7 more')).toBeOnTheScreen();
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
    // Moved off today: the one the server says can still be undone, as the Train card finds it (train/week.ts › movedOffToday).
    mockAnswers['/v1/program'] = fridayAs({ date: '2026-12-26', moved: true, movedFrom: '2026-12-25', undoable: true });
    await show();
    expect(screen.getByText(t('thisWeek.today.rest'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.movedTo', { day: 'Saturday' }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    expect(day('2026-12-26')).toBe('Saturday, planned');
  });

  test('a session moved on an earlier day is not today\'s: today is rest, with no line about it (one rule with the Train card)', async () => {
    mockAnswers['/v1/program'] = fridayAs({ date: '2026-12-26', moved: true, movedFrom: '2026-12-25' });
    await show();
    expect(screen.getByText(t('thisWeek.today.rest'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.today.movedTo', { day: 'Saturday' }))).toBeNull();
    expect(screen.queryByRole('button', { name: t('thisWeek.today.undo') })).toBeNull();
  });

  test("the server's today, not the phone's clock: past midnight on the phone, Friday's session still shows", async () => {
    onPhone(new Date(2026, 11, 26, 0, 30));
    await show();
    expect(screen.getByRole('button', { name: startFullBodyA() })).toBeOnTheScreen();
    expect(day('2026-12-25')).toBe('Friday, planned, today');
  });

  test("one today on the whole screen: the hero's days to the next call and the week's logs read the server's day, not the phone's", async () => {
    onPhone(new Date(2026, 11, 26, 0, 30)); // Saturday 00:30 on the phone; the user's calendar is still Friday
    await show();
    expect(screen.getByText(t('thisWeek.hero.inDays', { count: 3 }))).toBeOnTheScreen(); // 28 Dec from Friday 25, not from Saturday
    expect(mockGET).toHaveBeenCalledWith('/v1/workouts', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
    expect(mockGET).toHaveBeenCalledWith('/v1/weigh-ins', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
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

  test("UNDO refused (409: today's workout started): the week read again, then said so on the card as it now is", async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true, undoable: true });
    await show();
    mockPost = refused(409, 'CONFLICT');
    // The server's week now: no longer undoable.
    mockAnswers['/v1/program'] = fridayAs({ skipped: true });
    const reads = mockGET.mock.calls.filter(([path]) => path === '/v1/program').length;
    await press(t('thisWeek.today.undo'));
    expect(mockGET.mock.calls.filter(([path]) => path === '/v1/program').length).toBe(reads + 1);
    expect(screen.queryByRole('button', { name: t('thisWeek.today.undo') })).toBeNull();
    expect(screen.getByText(t('todayChange.started'))).toBeOnTheScreen();
  });

  test('FULL refused (409: the session is not on today any more, a stale card): "No session today", the week read again', async () => {
    mockAnswers['/v1/program'] = fridayAs({ short: true, exerciseIds: FRIDAY_MOVES.slice(0, 3) });
    await show();
    mockPost = refused(409, 'CONFLICT');
    // Each read is parsed anew: the week again, a new object (here, past midnight, still the short version).
    mockAnswers['/v1/program'] = fridayAs({ short: true, exerciseIds: FRIDAY_MOVES.slice(0, 3) });
    const reads = mockGET.mock.calls.filter(([path]) => path === '/v1/program').length;
    await press(t('thisWeek.today.full'));
    expect(mockGET.mock.calls.filter(([path]) => path === '/v1/program').length).toBe(reads + 1);
    expect(screen.getByText(t('todayChange.none'))).toBeOnTheScreen();
    expect(screen.queryByText(t('todayChange.started'))).toBeNull();
  });

  test("the server's answer shows at once: the card is the changed week before the read again is back", async () => {
    mockAnswers['/v1/program'] = fridayAs({ date: '2026-12-26', moved: true, movedFrom: '2026-12-25', undoable: true });
    await show();
    mockPost = ok(PROGRAM);
    // The read again hangs (Health, the queue, the server): the card does not wait for it.
    let release: () => void = () => {};
    mockServices.queue.drain.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
    await press(t('thisWeek.today.undo'));
    expect(screen.getByRole('button', { name: startFullBodyA() })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.today.undo') })).toBeNull();
    await act(async () => release());
  });

  test('two taps at once send one change', async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true, undoable: true });
    let answer: (value: Answer) => void = () => {};
    mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
    await show();
    const button = screen.getByRole('button', { name: t('thisWeek.today.undo') });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => answer(ok(PROGRAM)));
    expect(mockPOST).toHaveBeenCalledTimes(1);
  });

  test('undone with nothing to undo (200, the week as it was): no word, only the week read again', async () => {
    mockAnswers['/v1/program'] = fridayAs({ skipped: true, undoable: true });
    await show();
    mockPost = ok(PROGRAM);
    await press(t('thisWeek.today.undo'));
    expect(screen.queryByText(t('today.call.undone'))).toBeNull();
    expect(screen.queryByText(t('todayChange.started'))).toBeNull();
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
    // The server's DONE names the workout (w9), not the list's latest of the day (w3): the summary is w9's.
    mockAnswers['/v1/program'] = fridayAs({ workout: { id: 'w9', state: 'DONE' } });
    mockAnswers['/v1/workouts/{id}/summary'] = ok({ workoutId: 'w9', liftedKg: 8420, workingSets: 14, marks: [], weekOf: '2026-12-21', muscles: [] });
    await show();
    expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.doneStats.other', { count: 14, lifted: '8,420 kg' }))).toBeOnTheScreen();
    expect(mockGET).toHaveBeenCalledWith('/v1/workouts/{id}/summary', { params: { path: { id: 'w9' } } });
    expect(mockGET).not.toHaveBeenCalledWith('/v1/workouts/{id}/summary', { params: { path: { id: 'w3' } } });
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

  describe('under way on the server, not on this phone (K-999)', () => {
    const OPEN: Schemas['Workout'] = {
      id: 'w4',
      clientId: 'other-phone-w',
      startedAt: '2026-12-25T07:30:00Z',
      programDayId: 'c',
      pausedSeconds: 0,
      sets: [{ id: 's-1', clientId: 'other-phone-s1', exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8, rir: 2, side: 'BOTH' }],
    };
    const elsewhere = async () => {
      mockAnswers['/v1/program'] = fridayAs({ workout: { id: 'w4', state: 'OPEN' } });
      mockAnswers['/v1/workouts/{id}'] = ok(OPEN);
      await show();
    };

    test('Continue, Fill in later and Discard on the card', async () => {
      await elsewhere();
      expect(screen.getByRole('button', { name: t('openElsewhere.continueLabel') })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: t('openElsewhere.laterLabel') })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: t('openElsewhere.discardLabel') })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    });

    test("Continue reads the server's workout, keeps it on the phone and opens the session on it", async () => {
      await elsewhere();
      await press(t('openElsewhere.continueLabel'));
      expect(mockGET).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'w4' } } });
      expect(mockAdopt).toHaveBeenCalledWith(OPEN);
      expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    test('no connection: the card says so; trying again opens it', async () => {
      await elsewhere();
      mockAnswers['/v1/workouts/{id}'] = 'offline';
      await press(t('openElsewhere.continueLabel'));
      expect(screen.getByText(t('openElsewhere.offline'))).toBeOnTheScreen();
      expect(mockAdopt).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      mockAnswers['/v1/workouts/{id}'] = ok(OPEN);
      await press(t('openElsewhere.continueLabel'));
      expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    test('Discard asks once more, then deletes the workout on the server and reads the week again', async () => {
      await elsewhere();
      await press(t('openElsewhere.discardLabel'));
      expect(screen.getByText(t('workout.ending.discardAsk'))).toBeOnTheScreen();
      expect(mockDELETE).not.toHaveBeenCalled();
      const reads = mockGET.mock.calls.filter(([path]) => path === '/v1/program').length;
      await press(t('workout.ending.confirm'));
      expect(mockDELETE).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'w4' } } });
      expect(mockGET.mock.calls.filter(([path]) => path === '/v1/program')).toHaveLength(reads + 1);
    });

    test('Discard from a card that is out of date (the server has it ended): nothing is deleted, it says so', async () => {
      await elsewhere();
      mockAnswers['/v1/workouts/{id}'] = ok({ ...OPEN, endedAt: '2026-12-25T09:00:00Z' });
      await press(t('openElsewhere.discardLabel'));
      await press(t('workout.ending.confirm'));
      expect(screen.getByText(t('openElsewhere.closed'))).toBeOnTheScreen();
      expect(mockDELETE).not.toHaveBeenCalled();
    });

    test('Fill in later leaves it open and says it counts; nothing is sent', async () => {
      await elsewhere();
      await press(t('openElsewhere.laterLabel'));
      expect(screen.getByText(t('openElsewhere.laterSaid', { hours: workoutParams.unfinishedSessionCloseHours }))).toBeOnTheScreen();
      expect(mockDELETE).not.toHaveBeenCalled();
      expect(mockAdopt).not.toHaveBeenCalled();
    });
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

  test("another day's session finished here while today's is planned: done, no Start (one rule with the Train card)", async () => {
    mockServices.workoutRecords.mockResolvedValueOnce([
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'b' }),
      record(2, 'finish', 'f1', 'wo', { endedAt: '2026-12-25T09:00:00Z', uncleanExerciseIds: [] }),
    ]);
    await show();
    expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
  });

  describe('the program cannot be read (offline)', () => {
    const finishedOffline = [
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'c' }),
      record(2, 'finish', 'f1', 'wo', { endedAt: '2026-12-25T09:00:00Z', uncleanExerciseIds: [] }),
    ];

    test('a workout finished here is still done, with no copy of the program kept', async () => {
      mockAnswers['/v1/program'] = 'offline';
      mockServices.workoutRecords.mockResolvedValueOnce(finishedOffline);
      await show();
      expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
      // Nothing to name it by: the program is not there, so no day is told.
      expect(screen.queryByRole('header', { name: t('programDays.full_body_a.name') })).toBeNull();
    });

    test('with the copy the Train tab keeps and nothing done: the session it planned for today, to start', async () => {
      mockAnswers['/v1/program'] = 'offline';
      mockServices.training.keptProgram.mockResolvedValue(PROGRAM);
      await show();
      expect(screen.getByRole('header', { name: t('programDays.full_body_a.name') })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: startFullBodyA() })).toBeOnTheScreen();
    });

    test("with the copy the Train tab keeps: the session it names, done from the phone's records, and no Undo of the server's old word", async () => {
      mockAnswers['/v1/program'] = 'offline';
      mockServices.training.keptProgram.mockResolvedValue({ ...PROGRAM, week: [...(PROGRAM.week ?? []).slice(0, 2), { programDayId: 'c', date: '2026-12-25', exerciseIds: FRIDAY_MOVES, skipped: true, undoable: true }] });
      await show();
      expect(screen.queryByRole('button', { name: t('thisWeek.today.undo') })).toBeNull();
      expect(screen.queryByRole('button', { name: startFullBodyA() })).toBeNull();
      mockServices.workoutRecords.mockResolvedValueOnce(finishedOffline);
      await act(async () => mockRefocus());
      expect(screen.getByText(t('thisWeek.today.done'))).toBeOnTheScreen();
      // The copy names the day that was done (its program day 'c'); without the copy no day is told.
      expect(screen.getByRole('header', { name: t('programDays.full_body_a.name') })).toBeOnTheScreen();
    });
  });

  test('a workout left open: "Open workout · Continue" back into it, with the sets logged', async () => {
    mockServices.workoutRecords.mockResolvedValueOnce([
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'c' }),
      record(2, 'set', 's1', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
      record(3, 'set', 's2', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
    ]);
    await show();
    expect(screen.getByText(t('thisWeek.today.open'))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.openSets.other', { count: 2, hours: workoutParams.unfinishedSessionCloseHours }))).toBeOnTheScreen();
    await press(t('thisWeek.today.continue'));
    expect(mockPush).toHaveBeenCalledWith('/workout');
  });

  test('the open card says when the server closes the workout (unfinished_session_close_hours), not "anytime this week" (user test 10 Oct)', async () => {
    const open = (...sets: number[]) => [
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-25T08:00:00Z', programDayId: 'c' }),
      ...sets.map((n) => record(n + 1, 'set', `s${n}`, 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 })),
    ];
    const replaced = jest.replaceProperty(workoutParams, 'unfinishedSessionCloseHours', 36);
    try {
      mockServices.workoutRecords.mockResolvedValueOnce(open());
      await show();
      expect(screen.getByText('Finish within 36 hours of starting.')).toBeOnTheScreen();
      await screen.unmount();
      mockServices.workoutRecords.mockResolvedValueOnce(open(1));
      await show();
      expect(screen.getByText('1 set logged. Finish within 36 hours of starting.')).toBeOnTheScreen();
      expect(JSON.stringify(screen.toJSON())).not.toMatch(/anytime this week/i);
    } finally {
      replaced.restore();
    }
  });

  test("a workout left open past the server's close (days ago) is not continued: the server closed it", async () => {
    mockServices.workoutRecords.mockResolvedValueOnce([
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: '2026-12-22T08:00:00Z', programDayId: 'c' }),
      record(2, 'set', 's1', 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 }),
    ]);
    await show();
    expect(screen.queryByRole('button', { name: t('thisWeek.today.continue') })).toBeNull();
  });
});

describe('the food line', () => {
  const range = (low: string | number, high: string | number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;
  const single = (value: string) => t('food.budget.single', { value, unit: t('food.budget.kcalUnit') });

  test('"Food left" as ONE number (ADR-090 #5); the line opens the day\'s food, "Log" opens the meal (ADR-086)', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(1240, 1480));
    await show();
    expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
    expect(screen.getByText(single('1,360'))).toBeOnTheScreen();
    expect(screen.queryByText(range('1,240', '1,480'))).toBeNull();
    await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.left'), amount: single('1,360') }));
    expect(mockPush).toHaveBeenCalledWith('/food');
    expect(mockPush).not.toHaveBeenCalledWith('/meal');
    mockPush.mockClear();
    await press(t('thisWeek.food.logLabel'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
    expect(mockPush).not.toHaveBeenCalledWith('/food');
  });

  test('the card keeps the width the floating "+" can cover free at its right end, so Log is never under it (K-1066)', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(1240, 1480));
    await show();
    const card = StyleSheet.flatten(screen.getByTestId('food-line').props.style) as { paddingRight: number };
    expect(card.paddingRight).toBeGreaterThanOrEqual(PLUS_GUTTER);
  });

  test("a meal logged, the number comes down with the server's range; the range itself is in a tap's detail", async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(610, 720));
    await show();
    expect(screen.getByText(single('665'))).toBeOnTheScreen();
    expect(screen.queryByText(t('thisWeek.food.range', { range: range(610, 720) }))).toBeNull();
    await press(t('thisWeek.food.showRange'));
    expect(screen.getByText(t('thisWeek.food.range', { range: range(610, 720) }))).toBeOnTheScreen();
    await press(t('thisWeek.food.hideRange'));
    expect(screen.queryByText(t('thisWeek.food.range', { range: range(610, 720) }))).toBeNull();
  });

  test('the starting target is exact: one number and no range to open', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(2300, 2300));
    await show();
    expect(screen.getByText(single('2,300'))).toBeOnTheScreen();
    expect(screen.queryByTestId('food-line-detail')).toBeNull();
  });

  test('after the first call, nothing eaten: "Food left" too, as in the first week (one name for the number)', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(2300, 2300));
    await show();
    expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
  });

  test('without the health data consent: the lock line in its place, Allow leads to the consent', async () => {
    mockAnswers['/v1/days/{day}/budget'] = refused(403, 'CONSENT_REQUIRED');
    await show();
    expect(screen.queryByText(t('thisWeek.food.left'))).toBeNull();
    expect(screen.getByText(t('thisWeek.food.locked'))).toBeOnTheScreen();
    await press(t('thisWeek.food.allowLabel'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'consent' } });
  });

  describe('the first week (no call yet): the budget the server works out from the starting target (K-997)', () => {
    const FIRST_WEEK_BUDGET = (left: { low: number; high: number }, eaten: { low: number; high: number } = { low: 0, high: 0 }): Schemas['DayBudget'] => ({
      day: '2026-10-12',
      targetKcal: 2100,
      targetProteinG: 114,
      eaten: { kcal: eaten, proteinG: { low: 0, high: 0 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
      left: { kcal: left, proteinG: { low: 150, high: 150 } },
    });
    beforeEach(() => firstWeek());

    test('nothing eaten yet: "Food left" (the name does not flip at the first meal, K-1013) with the one number, from the budget route, and Log', async () => {
      mockAnswers['/v1/days/{day}/budget'] = ok(FIRST_WEEK_BUDGET({ low: 2100, high: 2100 }));
      await show();
      expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
      expect(screen.getByText(t('food.budget.single', { value: '2,100', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
      expect(mockGET).toHaveBeenCalledWith('/v1/days/{day}/budget', { params: { path: { day: '2026-10-12' } } });
      await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.left'), amount: '2,100 kcal' }));
      expect(mockPush).toHaveBeenCalledWith('/food');
    });

    test('a meal logged: "Food left" as the server\'s range, nothing taken off on the phone', async () => {
      mockAnswers['/v1/days/{day}/budget'] = ok(FIRST_WEEK_BUDGET({ low: 1480, high: 1620 }, { low: 480, high: 620 }));
      await show();
      expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
      expect(screen.getByText(single('1,550'))).toBeOnTheScreen();
    });

    test('the temporary starting route is not read for this line any more', async () => {
      mockAnswers['/v1/days/{day}/budget'] = ok(FIRST_WEEK_BUDGET({ low: 2100, high: 2100 }));
      await show();
      expect(mockGET.mock.calls.map((c) => c[0])).not.toContain('/v1/targets/starting');
    });

    test('no starting target (404: no profile, or no weigh-in): no line, and no complaint', async () => {
      await show();
      expect(screen.queryByTestId('food-line')).toBeNull();
      expect(screen.queryByTestId('food-locked')).toBeNull();
      expect(screen.queryByText(t('today.failed'))).toBeNull();
    });

    test('without the health data consent: the lock line, as in any week', async () => {
      mockAnswers['/v1/days/{day}/budget'] = refused(403, 'CONSENT_REQUIRED');
      await show();
      expect(screen.getByText(t('thisWeek.food.locked'))).toBeOnTheScreen();
      expect(screen.queryByText(t('thisWeek.food.left'))).toBeNull();
    });

    test('offline: no line, the screen says it could not read and offers to try again', async () => {
      mockAnswers['/v1/days/{day}/budget'] = 'offline';
      await show();
      expect(screen.queryByTestId('food-line')).toBeNull();
      expect(screen.getByText(t('today.failed'))).toBeOnTheScreen();
      mockAnswers['/v1/days/{day}/budget'] = ok(FIRST_WEEK_BUDGET({ low: 2100, high: 2100 }));
      await press(t('today.retry'));
      expect(screen.getByText(t('thisWeek.food.left'))).toBeOnTheScreen();
    });
  });

  test('no budget at all: no line', async () => {
    await show();
    expect(screen.queryByTestId('food-line')).toBeNull();
    expect(screen.queryByTestId('food-locked')).toBeNull();
  });
});

describe('after a save elsewhere (K-1044, ADR-070 Ek 2 #6)', () => {
  // The week as the app draws it, with the layout's banner over it; the weigh-in sheet that just closed is the one the Saver stands for.
  const showWithBanner = async () => {
    await render(
      <ThemeProvider scheme="light">
        <WithSaved>
          <Saver />
          <TodayScreen />
        </WithSaved>
      </ThemeProvider>,
    );
    await act(async () => {});
  };

  test('This week shows "Saved" with what was saved and Undo, on top of the week; Undo takes it back and the banner goes', async () => {
    ordinaryWeek();
    const undo = jest.fn(async () => ({ done: true as const }));
    await showWithBanner();
    expect(banner()).toBeNull();

    await publishSave({ detail: '80.2 kg', undo });

    expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
    expect(screen.getByText('80.2 kg')).toBeOnTheScreen();
    expect(screen.getByTestId('screen')).toBeOnTheScreen(); // the week is still there under it
    await fireEvent.press(undoButton());
    await act(async () => {});
    expect(undo).toHaveBeenCalledTimes(1);
    expect(banner()).toBeNull();
  });
});

describe('the first-use guide (K-1065)', () => {
  const withGuide = async (seen: boolean) => {
    const mark = { seen: jest.fn(async () => seen), markSeen: jest.fn(async () => {}), forget: jest.fn(async () => {}) };
    await render(
      <ThemeProvider scheme="light">
        <GuideProvider mark={mark}>
          <TodayScreen />
        </GuideProvider>
      </ThemeProvider>,
    );
    await act(async () => {});
    return mark;
  };

  test('asked once the week is on the screen, not before; seen already, it opens nothing', async () => {
    ordinaryWeek();
    const mark = await withGuide(true);
    expect(mark.seen).toHaveBeenCalledTimes(1);
    expect(mark.markSeen).not.toHaveBeenCalled();
  });

  test('not seen: it opens, and is kept as shown at once', async () => {
    ordinaryWeek();
    const mark = await withGuide(false);
    expect(mark.markSeen).toHaveBeenCalledTimes(1);
  });

  test('the week reads the same with the parts the guide points at held in views: the same blocks in the same order', async () => {
    ordinaryWeek();
    await withGuide(true);
    expect(screen.getByTestId('hero')).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.today.start'))).toBeOnTheScreen();
  });
});

describe('on the system (K-1045, ADR-070 Ek 2 #7, #8; prototype yeniden-yapim 5)', () => {
  const p = palettes.light;

  test('the strip needs no legend: done is a filled accent day with a tick, planned an accent ring, today an ink ring, any other day a small dot', async () => {
    await show();
    // Monday: trained, filled accent with the tick, no ring.
    expect(screen.getByTestId('mark-2026-12-21')).toHaveStyle({ backgroundColor: p.accent });
    expect(within(screen.getByTestId('day-2026-12-21')).getByTestId('tick')).toBeOnTheScreen();
    // Friday: planned and today: the accent ring inside the ink ring.
    expect(screen.getByTestId('mark-2026-12-25')).toHaveStyle({ borderColor: p.accent });
    expect(screen.getByTestId('ring-2026-12-25')).toHaveStyle({ borderColor: p.text });
    // Thursday: nothing planned, nothing done: a small dot, no ring, no fill.
    expect(screen.getByTestId('empty-dot-2026-12-24')).toBeOnTheScreen();
    expect(screen.getByTestId('mark-2026-12-24')).not.toHaveStyle({ backgroundColor: p.accent });
    // A day with a mark has no empty dot.
    expect(screen.queryByTestId('empty-dot-2026-12-21')).toBeNull();
    expect(screen.queryByTestId('empty-dot-2026-12-25')).toBeNull();
    // Only today has the ink ring.
    expect(screen.queryByTestId('ring-2026-12-24')).toBeNull();
  });

  // Evre 7 (the walk: "the week strip cannot be tapped"): a day opens as a short sheet with its plan or its log, never a "missed".
  test('a tap on a planned day opens its plan as short rows; Close puts the week back', async () => {
    await show();
    await fireEvent.press(screen.getByTestId('day-2026-12-25'));
    const sheet = within(screen.getByTestId('day-sheet'));
    expect(sheet.getByText(t('thisWeek.day.planned'))).toBeOnTheScreen();
    expect(sheet.getAllByTestId('day-row').length).toBeGreaterThan(0);
    await fireEvent.press(sheet.getByRole('button', { name: t('modal.close') }));
    expect(screen.queryByTestId('day-sheet')).toBeNull();
  });

  test('a tap on a day with nothing is "Rest day", no moves and nothing said as missed (U7)', async () => {
    await show();
    await fireEvent.press(screen.getByTestId('day-2026-12-24'));
    const sheet = within(screen.getByTestId('day-sheet'));
    expect(sheet.getByText(t('thisWeek.day.rest'))).toBeOnTheScreen();
    expect(sheet.queryAllByTestId('day-row')).toHaveLength(0);
  });

  test("today's card: three moves with their targets, \"and 1 more\", the cardio line with its icon, and one primary Start", async () => {
    await show();
    const card = within(screen.getByTestId('today-card'));
    expect(card.getAllByTestId(/^move-/)).toHaveLength(3);
    expect(card.getByText('and 1 more')).toBeOnTheScreen();
    expect(card.getByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeOnTheScreen();
    expect(card.getByTestId('cardio-icon')).toBeOnTheScreen();
    // One primary (the cta fill) in the card: Start. Change is not a second one.
    const primaries = card.getAllByRole('button').filter((b) => StyleSheet.flatten(b.props.style)?.backgroundColor === p.cta);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(card.getByRole('button', { name: startFullBodyA() }));
  });

  test('Change is not a filled button: no cta fill, still its own way to the change page', async () => {
    await show();
    const change = within(screen.getByTestId('today-card')).getByRole('button', { name: t('thisWeek.today.changeLabel') });
    expect(StyleSheet.flatten(change.props.style)?.backgroundColor).not.toBe(p.cta);
  });

  describe('a rest day', () => {
    beforeEach(() => {
      onPhone(new Date(2026, 11, 24, 9, 0)); // Thursday 24 Dec: no session today
      mockAnswers['/v1/program'] = ok({
        ...PROGRAM,
        today: '2026-12-24',
        cardio: { ...PROGRAM.cardio, sessions: [{ weekday: 'THURSDAY', place: 'AFTER_LIFT' }] },
      });
    });

    test('"Rest day", the next session by name and weekday, and the cardio line when cardio is planned; no Start', async () => {
      await show();
      const card = within(screen.getByTestId('today-card'));
      expect(card.getByText(t('thisWeek.today.rest'))).toBeOnTheScreen();
      expect(card.getByText(t('thisWeek.today.next', { session: t('programDays.full_body_a.name'), weekday: 'Friday' }))).toBeOnTheScreen();
      expect(card.getByText(t('thisWeek.today.cardio', { minutes: 30 }))).toBeOnTheScreen();
      expect(card.getByTestId('cardio-icon')).toBeOnTheScreen();
      expect(card.queryByRole('button', { name: startFullBodyA() })).toBeNull();
    });

    test('no cardio planned for the day: no cardio line; the next session is still said', async () => {
      mockAnswers['/v1/program'] = ok({ ...PROGRAM, today: '2026-12-24' });
      await show();
      const card = within(screen.getByTestId('today-card'));
      expect(card.getByText(t('thisWeek.today.next', { session: t('programDays.full_body_a.name'), weekday: 'Friday' }))).toBeOnTheScreen();
      expect(card.queryByTestId('cardio-icon')).toBeNull();
    });

    test('nothing left in the week: no next-session line, and none is made up', async () => {
      onPhone(new Date(2026, 11, 26, 9, 0)); // Saturday: Friday has passed
      mockAnswers['/v1/program'] = ok({ ...PROGRAM, today: '2026-12-26' });
      await show();
      expect(screen.queryByText(/^Next session/)).toBeNull();
    });
  });

  // K1 (Evre 7 A, review §7 P0): the Food card is an obvious card: its words, a bar of the day and a chevron open /food; "Log" was a text link
  // and is the secondary button (a fill, ink words) that opens /meal.
  test('Food left: the card opens /food (chevron and bar say so), and "Log" is a filled secondary button that opens /meal', async () => {
    mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(1240, 1480));
    await show();
    expect(screen.getByTestId('food-line-chevron')).toBeOnTheScreen();
    expect(within(screen.getByTestId('food-line')).getByRole('progressbar')).toBeOnTheScreen();
    const log = screen.getByRole('button', { name: t('thisWeek.food.logLabel') });
    expect(StyleSheet.flatten(log.props.style)?.backgroundColor).toBe(p.raise);
    expect(within(log).getByText(t('thisWeek.food.log'))).toHaveStyle({ color: p.text });
    await press(t('thisWeek.food.logLabel'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
    mockPush.mockClear();
    await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.left'), amount: t('food.budget.single', { value: '1,360', unit: t('food.budget.kcalUnit') }) }));
    expect(mockPush).toHaveBeenCalledWith('/food');
  });

  test("the week count is Progress's line, from one function (weekRecordText)", async () => {
    await show();
    expect(screen.getByText(weekRecordText({ onTrack: 11, counted: 12 }))).toBeOnTheScreen();
    expect(weekRecordText({ onTrack: 0, counted: 1 })).toBe('0/1 week on track');
  });
});

describe("this week's weigh-ins before the first calls (ADR-089, K-1058, prototype 11.1-11.4)", () => {
  // Monday 2 Nov 2026 is the call day: the block runs Tuesday 27 Oct to Monday 2 Nov.
  const weighInWeek = (weighedDays: string[], extra: Partial<Schemas['WeighInWeek']> = {}): Schemas['WeighInWeek'] => ({
    from: '2026-10-27',
    to: '2026-11-02',
    weighedDays,
    needed: 4,
    ...extra,
  });
  const WEEK_ONE = { week: 2, risk: [], readsRisk: false, training: true, firstCallOn: '2026-11-02' };
  const counter = () => within(screen.getByTestId('weigh-in-counter'));
  const firstWeeksWith = (week: Schemas['WeighInWeek'] | undefined) => {
    mockAnswers['/v1/first-weeks'] = ok({ ...WEEK_ONE, ...(week === undefined ? {} : { weighInWeek: week }) });
  };

  // Friday 30 Oct, the week after onboarding: no call yet, the hero is "Your start".
  beforeEach(() => {
    firstWeek();
    onPhone(new Date(2026, 9, 30, 9, 0));
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, today: '2026-10-30', weekOf: '2026-10-26' });
  });

  test('behind: the days from the block (Tuesday first), the count, the line, and Weigh in, which opens the weigh-in screen', async () => {
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29']));
    await show();
    expect(screen.getByText(t('thisWeek.hero.start'))).toBeOnTheScreen();
    expect(counter().getByText(t('thisWeek.counter.title'))).toBeOnTheScreen();
    expect(counter().getByText(t('thisWeek.counter.of', { count: 2, needed: 4 }))).toBeOnTheScreen();
    expect(counter().getByText(t('thisWeek.counter.behind', { count: 2, day: 'Monday' }))).toBeOnTheScreen();
    expect(counter().getAllByText(/^[MTWFS]$/).map((l) => l.props.children)).toEqual(['T', 'W', 'T', 'F', 'S', 'S', 'M']);
    // Filled = weighed, ring = today (Friday).
    expect(screen.getByTestId('counter-day-2026-10-27')).toHaveStyle({ backgroundColor: palettes.light.accentInk });
    expect(screen.getByTestId('counter-day-2026-10-28')).not.toHaveStyle({ backgroundColor: palettes.light.accentInk });
    expect(screen.getByTestId('counter-day-2026-10-30')).toHaveStyle({ borderColor: palettes.light.decisionText });
    // The line that told the same thing without a number is gone; the first call's day stays.
    expect(screen.queryByText(t('thisWeek.hero.weighIn'))).toBeNull();
    expect(screen.getByText(t('thisWeek.hero.firstCall', { day: 'Monday' }))).toBeOnTheScreen();
    await press(t('thisWeek.counter.weighIn'));
    expect(mockPush).toHaveBeenCalledWith('/weigh-in');
  });

  test('enough: a check beside the count, no button, the call named', async () => {
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']));
    await show();
    expect(counter().getByText(t('thisWeek.counter.of', { count: 4, needed: 4 }))).toBeOnTheScreen();
    expect(counter().getByTestId('counter-reached')).toBeOnTheScreen();
    expect(counter().getByText(t('thisWeek.counter.enough', { day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.counter.weighIn') })).toBeNull();
  });

  test('today already weighed: the count shows it, there is no button', async () => {
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-30']));
    await show();
    expect(counter().getByText(t('thisWeek.counter.behind', { count: 2, day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.counter.weighIn') })).toBeNull();
  });

  test('the last chance: today and tomorrow, with the button', async () => {
    onPhone(new Date(2026, 10, 1, 9, 0)); // Sunday 1 Nov
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, today: '2026-11-01', weekOf: '2026-10-26' });
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29']));
    await show();
    expect(counter().getByText(t('thisWeek.counter.last.todayTomorrow', { day: 'Monday' }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('thisWeek.counter.weighIn') })).toBeOnTheScreen();
  });

  test("a short week: the server's date, no button, the training line, and no first call's day beside it", async () => {
    onPhone(new Date(2026, 10, 1, 9, 0));
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, today: '2026-11-01', weekOf: '2026-10-26' });
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29'], { callsFrom: '2026-11-18' }));
    await show();
    expect(counter().getByText(t('thisWeek.counter.short', { day: 'Monday', date: 'Wed, Nov 18' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.counter.shortFoot'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.counter.weighIn') })).toBeNull();
    expect(screen.queryByText(t('thisWeek.hero.firstCall', { day: 'Monday' }))).toBeNull();
  });

  test('no weighInWeek: no counter, the hero as before', async () => {
    firstWeeksWith(undefined);
    await show();
    expect(screen.queryByTestId('weigh-in-counter')).toBeNull();
    expect(screen.getByText(t('thisWeek.hero.weighIn'))).toBeOnTheScreen();
  });

  test('a call card (the call that closes week 1 does not read the scale): the counter is there too, outside the one control', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision());
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29']));
    await show();
    expect(hero()).toBeOnTheScreen();
    expect(counter().getByText(t('thisWeek.counter.behind', { count: 2, day: 'Monday' }))).toBeOnTheScreen();
    // Not inside the call's control: its Weigh in is a button of its own.
    expect(within(hero()).queryByTestId('weigh-in-counter')).toBeNull();
    await press(t('thisWeek.counter.weighIn'));
    expect(mockPush).toHaveBeenCalledWith('/weigh-in');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('a call card with no weighInWeek (a call has read the scale): no counter', async () => {
    mockAnswers['/v1/decisions/current'] = ok(decision());
    firstWeeksWith(undefined);
    await show();
    expect(hero()).toBeOnTheScreen();
    expect(screen.queryByTestId('weigh-in-counter')).toBeNull();
  });

  test('read again after a weigh-in is saved: the new count is on the card', async () => {
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29']));
    await render(
      <ThemeProvider scheme="light">
        <WithSaved>
          <Saver />
          <TodayScreen />
        </WithSaved>
      </ThemeProvider>,
    );
    await act(async () => {});
    expect(counter().getByText(t('thisWeek.counter.of', { count: 2, needed: 4 }))).toBeOnTheScreen();
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29', '2026-10-30']));
    await publishSave({ detail: '80.2 kg', undo: async () => ({ done: true as const }) });
    await act(async () => {});
    expect(counter().getByText(t('thisWeek.counter.of', { count: 3, needed: 4 }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('thisWeek.counter.weighIn') })).toBeNull();
  });

  test('the reminders are told the week each time it is read (the training reminder carries the line, ADR-089 Ek 2)', async () => {
    firstWeeksWith(weighInWeek(['2026-10-27', '2026-10-29', '2026-11-05']));
    await show();
    expect(mockServices.reminders.keepWeighInWeek).toHaveBeenLastCalledWith({ from: '2026-10-27', to: '2026-11-02', weighed: 2, needed: 4, short: false }, 0);
    firstWeeksWith(weighInWeek(['2026-10-27'], { callsFrom: '2026-11-18' }));
    await act(async () => mockRefocus());
    expect(mockServices.reminders.keepWeighInWeek).toHaveBeenLastCalledWith({ from: '2026-10-27', to: '2026-11-02', weighed: 1, needed: 4, short: true }, 0);
    firstWeeksWith(undefined);
    await act(async () => mockRefocus());
    expect(mockServices.reminders.keepWeighInWeek).toHaveBeenLastCalledWith(null, 0);
  });

  test('first weeks not read (offline): the reminders keep what they had', async () => {
    mockAnswers['/v1/first-weeks'] = 'offline';
    await show();
    expect(mockServices.reminders.keepWeighInWeek).not.toHaveBeenCalled();
  });
});
