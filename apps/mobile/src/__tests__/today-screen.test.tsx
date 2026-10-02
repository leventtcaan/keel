/**
 * The Today screen (K-401, prototype 2.1): the consistency number and its four parts (K-420), this week's call from its
 * copy key with "Why this call" (reasons, their kind of source, the next review), today's list, and the coach's chips
 * from the day's data. A safety call shows as its general change (ADR-028 #24): no word of a hard stop or a cycle on
 * the screen.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { formatWeight } from '@/units/units';

type Schemas = components['schemas'];
type Answer = {
  data?: unknown;
  error?: { code: string; message: string };
  response: Response;
};
const ok = (data: unknown): Answer => ({
  data,
  response: new Response(null, { status: 200 }),
});
const refused = (status: number, code: string): Answer => ({
  error: { code, message: 'x' },
  response: new Response(null, { status }),
});

const CONSISTENCY: Schemas['Consistency'] = {
  weekOf: '2026-09-28',
  training: { planned: 3, done: 2 },
  protein: { planned: 4, done: 3 },
  steps: { planned: 5, done: 5 },
  weighIns: { planned: 7, done: 6 },
  planned: 19,
  done: 16,
  percent: 84,
  record: { onTrackWeeks: 2, countedWeeks: 3, currentRun: 2 },
};
const decision = (copyKey: string, extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'CONTINUE' } as Schemas['Decision']['action'],
  reasons: [
    {
      rule: copyKey.split('.')[2],
      source: { reference: 'arastirma/ham/guray/G2.md#K-1', tag: 'EXPERIENCE' },
    },
  ],
  confidence: 'HIGH',
  nextReview: '2026-10-05',
  copyKey,
  application: { state: 'NOT_NEEDED' },
  ...extra,
});
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [{ id: 'a', nameKey: 'upper_a', weekday: 'TUESDAY', exercises: [] }],
};

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockPush = jest.fn();
// The screen reads on focus, as on expo-router: the effect runs when the screen comes into view, and again each time.
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
// The app coming back to the front (AppState), captured so a test can send it.
let mockForeground: (state: string) => void = () => {};
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mockForeground = listener;
      return { remove: () => {} };
    },
    currentState: 'active',
  },
}));
// One object for the life of the test, as the real services are built once per process: the screen depends on it.
const mockSyncHealth = jest.fn(async () => 0);
const mockDrain = jest.fn(async () => {});
const mockKeepRestUntil = jest.fn(async (_day: string | null, _era?: number) => {});
const mockServices = {
  api: { GET: mockGET },
  syncHealth: mockSyncHealth,
  queue: { drain: mockDrain },
  report: () => {},
  // The reminders follow the program's week off (ADR-037 › 51b).
  reminders: { keepRestUntil: mockKeepRestUntil, era: () => 0 },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
}));

beforeAll(() => {
  // Tuesday 29 Sep 2026, morning, on the phone's calendar; only the date is fake, timers are real.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
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
  mockAnswers = {
    '/v1/consistency': ok(CONSISTENCY),
    '/v1/decisions/current': ok(decision('decision.continue.toward_goal')),
    '/v1/program': ok(PROGRAM),
    '/v1/weigh-ins': ok([
      {
        id: 'w',
        clientId: 'c',
        measuredAt: '2026-09-29T05:12:00Z',
        kg: 81.4,
        source: 'MANUAL',
      },
    ]),
    '/v1/targets': ok({
      stepsPerDay: 8000,
      trainingSessionsPerWeek: 3,
      targetKcal: 2300,
      proteinG: 160,
    }),
  };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <TodayScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
/** Everything the screen renders, words and labels, for what must never be there. */
const allText = () => JSON.stringify(screen.toJSON());

test('the number and its four parts, as the server counted them', async () => {
  await show();
  expect(screen.getByText(t('today.consistency.percent', { percent: 84 }))).toBeOnTheScreen();
  expect(screen.getByText(t('today.consistency.of', { done: 16, planned: 19 }))).toBeOnTheScreen();
  for (const [part, count] of [
    ['training', '2/3'],
    ['protein', '3/4'],
    ['steps', '5/5'],
    ['weighIns', '6/7'],
  ]) {
    expect(
      screen.getByLabelText(
        t('today.consistency.partSpoken', {
          part: t(`today.consistency.${part}`),
          done: count.split('/')[0],
          planned: count.split('/')[1],
        }),
      ),
    ).toBeOnTheScreen();
  }
  expect(screen.getByText(t('today.consistency.record', { onTrack: 2, counted: 3 }))).toBeOnTheScreen();
});

test("this week's call: its label, its words from the copy key, its confidence; 'Why this call' opens the reasons", async () => {
  await show();
  expect(screen.getByText(t('decision.continue.label'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.continue.toward_goal.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.continue.toward_goal.body'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.confidence.HIGH'))).toBeOnTheScreen();
  expect(screen.queryByText(t('today.call.source.EXPERIENCE'))).toBeNull();

  await press(t('today.call.why'));

  expect(screen.getByText(t('today.call.source.EXPERIENCE'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.nextReview', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(screen.getAllByText(t('decision.continue.toward_goal.title'))).toHaveLength(1); // the leading reason is the title
  await press(t('today.call.hide'));
  expect(screen.queryByText(t('today.call.source.EXPERIENCE'))).toBeNull();
});

test("no call yet this week: the engine's 'not yet', the cycle check's variant included, from its copy key (U3)", async () => {
  mockAnswers['/v1/decisions/current'] = ok(
    decision('decision.no_decision_yet.cycle_check_needed', {
      action: { type: 'NO_DECISION_YET' } as Schemas['Decision']['action'],
    }),
  );
  await show();
  expect(screen.getByText(t('decision.no_decision_yet.label'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.no_decision_yet.cycle_check_needed.title'))).toBeOnTheScreen();
});

test('a safety call shows as its general change: no hard stop, no cycle, on the screen or behind "Why this call"', async () => {
  mockAnswers['/v1/decisions/current'] = ok(
    decision('decision.change_phase.low_energy_safety', {
      action: {
        type: 'CHANGE_PHASE',
        to: 'BULK',
      } as Schemas['Decision']['action'],
      safety: true,
      reasons: [
        {
          rule: 'low_energy_safety',
          source: {
            reference: 'arastirma/ham/J1-cinsiyet.md#C6',
            tag: 'LITERATURE',
          },
        },
      ],
    }),
  );
  await show();
  await press(t('today.call.why'));
  expect(screen.getByText(t('decision.change_phase.label'))).toBeOnTheScreen();
  expect(allText()).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
  expect(allText()).not.toContain('J1-cinsiyet'); // the reference is the kind of source on the phone, not the file
});

test.each([
  ['decision.mini_cut.appetite_gone', 'MINI_CUT'],
  ['decision.continue.mini_cut_running', 'CONTINUE'],
  ['decision.change_phase.mini_cut_over', 'CHANGE_PHASE'],
])('the short cut speaks with its own words: %s', async (copyKey, type) => {
  mockAnswers['/v1/decisions/current'] = ok(decision(copyKey, { action: { type } as Schemas['Decision']['action'] }));
  await show();
  expect(screen.getByText(t(`${copyKey}.title`))).toBeOnTheScreen();
  expect(screen.getByText(t(`${copyKey}.body`))).toBeOnTheScreen();
});

test("today's list: the weigh-in done, the program's session for today, the step target", async () => {
  await show();
  expect(screen.getByText(t('today.list.weighIn.done'))).toBeOnTheScreen();
  expect(screen.getByText(formatWeight(81.4, 'METRIC'))).toBeOnTheScreen();
  expect(screen.getByText(t('programDays.upper_a.name'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.list.steps.target', { steps: '8,000' }))).toBeOnTheScreen();
});

test("today's list: what is left of the day's food, as ranges (K-409)", async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok({
    day: '2026-09-29',
    targetKcal: 2300,
    eaten: { kcal: { low: 1350, high: 1520 }, proteinG: { low: 80, high: 96 }, carbsG: { low: 1, high: 2 }, fatG: { low: 1, high: 2 } },
    left: { kcal: { low: 780, high: 950 }, proteinG: { low: 64, high: 80 } },
  });
  await show();
  expect(screen.getByText(t('today.list.food.title'))).toBeOnTheScreen();
  expect(screen.getByText(`${t('format.range', { low: 780, high: 950 })} ${t('food.budget.kcalUnit')}`)).toBeOnTheScreen();
});

test('no weigh-in yet today: the row opens the weigh-in (K-402)', async () => {
  mockAnswers['/v1/weigh-ins'] = ok([]);
  await show();
  await press(t('today.list.weighIn.log'));
  expect(mockPush).toHaveBeenCalledWith('/weigh-in');
});

test('before anything is there: each part says what comes, and the others still show', async () => {
  mockAnswers = {
    '/v1/weigh-ins': ok([]),
    '/v1/program': ok({ ...PROGRAM, days: [] }),
  };
  await show();
  expect(screen.getByText(t('today.consistency.firstWeek'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.none'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.list.weighIn.todo'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.list.training.rest'))).toBeOnTheScreen();
  expect(screen.queryByText(t('today.consistency.percent', { percent: 84 }))).toBeNull();
});

test('without the health data consent: no number and no call, a way to Settings instead', async () => {
  for (const path of ['/v1/consistency', '/v1/decisions/current', '/v1/weigh-ins', '/v1/targets']) {
    mockAnswers[path] = refused(403, 'CONSENT_REQUIRED');
  }
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
  expect(screen.queryByText(t('today.consistency.percent', { percent: 84 }))).toBeNull();
  await press(t('today.consent.open'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
  expect(screen.getByText(t('programDays.upper_a.name'))).toBeOnTheScreen(); // training is not health data
});

test('offline: it says so, and trying again reads again', async () => {
  for (const path of Object.keys(mockAnswers)) mockAnswers[path] = 'offline';
  await show();
  expect(screen.getByText(t('today.failed'))).toBeOnTheScreen();
  const calls = mockGET.mock.calls.length;
  mockAnswers['/v1/consistency'] = ok(CONSISTENCY);
  await press(t('today.retry'));
  expect(mockGET.mock.calls.length).toBeGreaterThan(calls);
  expect(screen.getByText(t('today.consistency.percent', { percent: 84 }))).toBeOnTheScreen();
});

test("the coach's chips come from the day; one opens the coach", async () => {
  await show();
  expect(screen.getByRole('button', { name: t('today.chips.why') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('today.chips.swap') })).toBeOnTheScreen();
  await press(t('today.chips.why'));
  expect(mockPush).toHaveBeenCalledWith('/coach');
});

test('back on Today after giving the consent in Settings, it reads again and shows the number (K-401 review)', async () => {
  mockAnswers['/v1/consistency'] = refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
  mockAnswers['/v1/consistency'] = ok(CONSISTENCY);

  await act(async () => mockRefocus());

  expect(screen.getByText(t('today.consistency.percent', { percent: 84 }))).toBeOnTheScreen();
});

test('the app back in front reads again: a new day, new logs (K-401 review)', async () => {
  await show();
  const calls = mockGET.mock.calls.length;
  await act(async () => mockForeground('background'));
  expect(mockGET.mock.calls.length).toBe(calls);

  await act(async () => mockForeground('active'));

  expect(mockGET.mock.calls.length).toBeGreaterThan(calls);
});

test("Apple Health's new weigh-ins go in before Today reads; a failing Health read never blanks Today (K-402)", async () => {
  let finish: (added: number) => void = () => {};
  mockSyncHealth.mockImplementationOnce(() => new Promise<number>((resolve) => (finish = resolve)));
  await show();
  expect(mockGET).not.toHaveBeenCalled(); // Today waits for the weigh-ins Health brought

  await act(async () => finish(1));
  expect(mockGET).toHaveBeenCalled();

  mockSyncHealth.mockRejectedValueOnce(new Error('HealthKit'));
  await act(async () => mockRefocus());
  expect(screen.getByText(t('today.consistency.percent', { percent: 84 }))).toBeOnTheScreen();
});

test('what waits on the phone is sent before Today reads: a weigh-in just saved shows as done (K-402 review)', async () => {
  let sent: () => void = () => {};
  mockDrain.mockImplementationOnce(() => new Promise<void>((resolve) => (sent = resolve)));
  await show();
  expect(mockGET).not.toHaveBeenCalled();
  await act(async () => sent());
  expect(mockGET).toHaveBeenCalled();
});

test.each([
  ['offline', 'offline'],
  ['without the consent', 'consent'],
] as const)('%s, the weigh-in can still be opened (it asks for the consent itself; K-402 review)', async (_label, state) => {
  mockAnswers['/v1/weigh-ins'] = state === 'offline' ? 'offline' : refused(403, 'CONSENT_REQUIRED');
  await show();
  await press(t('today.list.weighIn.log'));
  expect(mockPush).toHaveBeenCalledWith('/weigh-in');
});

test("today's steps from Apple Health, against the target (K-404)", async () => {
  mockSyncHealth.mockResolvedValueOnce({ weighIns: 0, stepsToday: 6240 } as never);
  await show();
  expect(screen.getByText(t('today.list.steps.count', { steps: '6,240', target: '8,000' }))).toBeOnTheScreen();
});

test('Settings is still one tap from Today', async () => {
  await show();
  await press(t('settings.entry'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

describe("the program's week off reaches the reminders (ADR-037 › 51b)", () => {
  test('a week off in the program: its last day; none: null; unread: nothing said', async () => {
    mockAnswers['/v1/program'] = ok({ ...PROGRAM, restUntil: '2026-10-04' });
    await show();
    expect(mockKeepRestUntil).toHaveBeenLastCalledWith('2026-10-04', 0);
    await screen.unmount();

    jest.clearAllMocks();
    mockAnswers['/v1/program'] = ok(PROGRAM);
    await show();
    expect(mockKeepRestUntil).toHaveBeenLastCalledWith(null, 0);
    await screen.unmount();

    jest.clearAllMocks();
    delete mockAnswers['/v1/program']; // no program on the server (404): none
    await show();
    expect(mockKeepRestUntil).toHaveBeenLastCalledWith(null, 0);
    await screen.unmount();

    jest.clearAllMocks();
    mockAnswers['/v1/program'] = 'offline';
    await show();
    expect(mockKeepRestUntil).not.toHaveBeenCalled();
  });
});

describe("this week's check-in (K-501)", () => {
  const question = (kind: Schemas['QuestionKind']): Schemas['Question'] => ({
    kind,
    format: 'CHOICE',
    choices: ['GOOD', 'POOR'],
    copyKey: `checkIn.question.${kind.toLowerCase()}`,
    reasonCopyKey: `checkIn.reason.${kind.toLowerCase()}`,
  });
  const checkIn = (answered: boolean, questions: Schemas['Question'][]) => ok({ weekOf: '2026-09-28', answered, questions });

  test('not answered yet: a card that says how much it asks, and opens the check-in', async () => {
    mockAnswers['/v1/check-ins/current'] = checkIn(false, [question('TRAINING'), question('RECOVERY')]);
    await show();
    expect(screen.getByText(t('today.checkIn.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('today.checkIn.questions', { count: 2 }))).toBeOnTheScreen();
    await press(t('today.checkIn.open'));
    expect(mockPush).toHaveBeenCalledWith('/check-in');
  });

  test('one question: said as one', async () => {
    mockAnswers['/v1/check-ins/current'] = checkIn(false, [question('TRAINING')]);
    await show();
    expect(screen.getByText(t('today.checkIn.one'))).toBeOnTheScreen();
  });

  test('nothing to ask: the call is one tap away', async () => {
    mockAnswers['/v1/check-ins/current'] = checkIn(false, []);
    await show();
    expect(screen.getByText(t('today.checkIn.none'))).toBeOnTheScreen();
  });

  test('a check-in that could not be read says so, with a way to read again', async () => {
    mockAnswers['/v1/check-ins/current'] = 'offline';
    await show();
    expect(screen.getByText(t('today.failed'))).toBeOnTheScreen();
  });

  test("answered: no card — the week's call is the call card's", async () => {
    mockAnswers['/v1/check-ins/current'] = checkIn(true, []);
    await show();
    expect(screen.queryByText(t('today.checkIn.title'))).toBeNull();
  });
});
