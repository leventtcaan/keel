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
      source: { tag: 'EXPERIENCE' },
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
// An answer to one of the coach's questions (K-520): what the server says back.
let mockPost: Answer | 'offline' = { data: {}, response: new Response(null, { status: 200 }) } as Answer;
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPost === 'offline') throw new TypeError('Network request failed');
  return mockPost;
});
const mockServices = {
  api: { GET: mockGET, POST: mockPOST },
  syncHealth: mockSyncHealth,
  queue: { drain: mockDrain },
  report: () => {},
  // The reminders follow the program's week off (ADR-037 › 51b).
  reminders: { keepRestUntil: mockKeepRestUntil, era: () => 0 },
  // The state read is kept on the phone for the reminders (K-518).
  state: { keep: jest.fn(async (_loaded: unknown) => {}), back: jest.fn(async () => {}) },
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
  mockPost = ok({});
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
  mockAnswers['/v1/decisions/current'] = ok(
    decision('decision.continue.toward_goal', {
      reasons: [
        { rule: 'toward_goal', source: { tag: 'EXPERIENCE' } },
        { rule: 'energy_floor', source: { tag: 'LITERATURE' } },
      ],
    }),
  );
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
  expect(screen.getByText(t('decision.rule.toward_goal'))).toBeOnTheScreen(); // and says its own sentence (K-522)
  expect(screen.getByText(t('decision.rule.energy_floor'))).toBeOnTheScreen();
  await press(t('today.call.hide'));
  expect(screen.queryByText(t('decision.rule.toward_goal'))).toBeNull();
  expect(screen.queryByText(t('decision.rule.energy_floor'))).toBeNull();
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
          source: { tag: 'LITERATURE' },
        },
      ],
    }),
  );
  await show();
  await press(t('today.call.why'));
  expect(screen.getByText(t('decision.change_phase.label'))).toBeOnTheScreen();
  expect(screen.queryByText(t('decision.rule.low_energy_safety'))).toBeNull();
  expect(allText()).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
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

describe('state mode on Today (K-518, ADR-038)', () => {
  test('a state in force: the week is paused, since when, and "I\'m back" ends it — read again, the welcome stays', async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'SICK', since: '2026-09-28' });
    mockServices.state.back.mockImplementationOnce(async () => {
      mockAnswers['/v1/state'] = refused(404, 'NOT_FOUND');
    });
    await show();
    expect(screen.getByText(t('today.state.paused', { state: t('state.kind.sick.name'), since: 'Mon, Sep 28' }))).toBeOnTheScreen();
    await press(t('today.state.back'));
    expect(mockServices.state.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('today.state.paused', { state: t('state.kind.sick.name'), since: 'Mon, Sep 28' }))).toBeNull();
    expect(screen.getByText(t('today.state.welcomeBack'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('today.state.declare') })).toBeOnTheScreen();
  });

  test('a note belongs to the state it was said for: a new state shows no old welcome', async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'SICK', since: '2026-09-28' });
    mockServices.state.back.mockImplementationOnce(async () => {
      mockAnswers['/v1/state'] = ok({ kind: 'BUSY', since: '2026-09-29' });
    });
    await show();
    await press(t('today.state.back'));
    expect(screen.queryByText(t('today.state.welcomeBack'))).toBeNull();
  });

  test('no state: one quiet way to say life got in the way', async () => {
    await show();
    await press(t('today.state.declare'));
    expect(mockPush).toHaveBeenCalledWith('/state');
  });

  test("what the server said is kept on the phone, so the reminders know (ADR-036 #7)", async () => {
    mockAnswers['/v1/state'] = ok({ kind: 'BUSY', since: '2026-09-28' });
    await show();
    expect(mockServices.state.keep).toHaveBeenCalledWith({ state: 'ready', value: { kind: 'BUSY', since: '2026-09-28' } });
  });

  test('a paused week says so on the number: it counts neither way', async () => {
    mockAnswers['/v1/consistency'] = ok({ ...CONSISTENCY, paused: true });
    await show();
    expect(screen.getByText(t('today.consistency.paused'))).toBeOnTheScreen();
  });
});

describe("the coach's own questions (K-520, ADR-039)", () => {
  const STEPS: Schemas['Prompt'] = {
    rule: 'steps_dropped',
    key: '2026-09-21',
    copyKey: 'prompt.steps_dropped',
    choices: ['BUSY', 'LESS'],
    source: { tag: 'EXPERIENCE' },
  };
  const MISSED: Schemas['Prompt'] = {
    rule: 'sessions_missed',
    key: '2026-09-24',
    copyKey: 'prompt.sessions_missed',
    choices: ['FIXED_TIME', 'LIFE', 'NOT_NOW'],
    source: { tag: 'EXPERIENCE' },
  };

  test('one question at a time, in its own words, with its answers', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS, MISSED]);
    await show();
    expect(screen.getByText(t('prompt.steps_dropped.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('prompt.steps_dropped.body'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('prompt.steps_dropped.choice.busy') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('prompt.steps_dropped.choice.less') })).toBeOnTheScreen();
    // U9: the second waits for the first to be answered.
    expect(screen.queryByText(t('prompt.sessions_missed.title'))).toBeNull();
  });

  test('an answer goes to the server once, for that occurrence; its reply is shown in place of the answers', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    mockPost = ok({ replyCopyKey: 'prompt.steps_dropped.reply.less' });
    await show();
    await press(t('prompt.steps_dropped.choice.less'));
    expect(mockPOST).toHaveBeenCalledTimes(1);
    expect(mockPOST).toHaveBeenCalledWith('/v1/prompts/{rule}/answers', {
      params: { path: { rule: 'steps_dropped' } },
      body: { key: '2026-09-21', choice: 'LESS' },
    });
    expect(screen.getByText(t('prompt.steps_dropped.reply.less'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('prompt.steps_dropped.choice.less') })).toBeNull();
  });

  test('life got in the way: answered, then the state screen (K-518)', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    await show();
    await press(t('prompt.steps_dropped.choice.busy'));
    expect(mockPOST).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/state');
  });

  test('a fixed time: answered, then the reminders in Settings; life: the state screen', async () => {
    mockAnswers['/v1/prompts'] = ok([MISSED]);
    await show();
    await press(t('prompt.sessions_missed.choice.fixed_time'));
    expect(mockPush).toHaveBeenCalledWith('/settings');

    mockPush.mockClear();
    mockAnswers['/v1/prompts'] = ok([{ ...MISSED, key: '2026-09-28' }]);
    await act(async () => mockRefocus());
    await press(t('prompt.sessions_missed.choice.life'));
    expect(mockPush).toHaveBeenCalledWith('/state');
  });

  test('not sent: said once, the answers stay to try again, and nowhere is opened', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    mockPost = 'offline';
    await show();
    await press(t('prompt.steps_dropped.choice.busy'));
    expect(screen.getByText(t('today.prompt.failed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('prompt.steps_dropped.choice.busy') })).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('refused by the server: said so, not "check your connection"', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    mockPost = refused(500, 'INTERNAL');
    await show();
    await press(t('prompt.steps_dropped.choice.less'));
    expect(screen.getByText(t('today.prompt.refused'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.prompt.failed'))).toBeNull();
  });

  test('a note that it was not sent goes once Today reads again', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    mockPost = 'offline';
    await show();
    await press(t('prompt.steps_dropped.choice.less'));
    expect(screen.getByText(t('today.prompt.failed'))).toBeOnTheScreen();
    await act(async () => mockRefocus());
    expect(screen.queryByText(t('today.prompt.failed'))).toBeNull();
    expect(screen.getByRole('button', { name: t('prompt.steps_dropped.choice.less') })).toBeOnTheScreen();
  });

  test('an answer that leads elsewhere leaves no question behind', async () => {
    mockAnswers['/v1/prompts'] = ok([STEPS]);
    await show();
    await press(t('prompt.steps_dropped.choice.busy'));
    expect(screen.queryByText(t('prompt.steps_dropped.title'))).toBeNull();
  });

  test('no questions, or none could be read: nothing is shown and nothing said failed', async () => {
    mockAnswers['/v1/prompts'] = ok([]);
    await show();
    expect(screen.queryByText(t('today.failed'))).toBeNull();
    mockAnswers['/v1/prompts'] = 'offline';
    await act(async () => mockRefocus());
    expect(screen.queryByText(t('prompt.steps_dropped.title'))).toBeNull();
  });
});

describe("the call's three variants (K-502, prototype 3.2-3.4): from what the server says, never decided here", () => {
  const nextReview = t('today.call.nextReview', { date: 'Mon, Oct 5' });

  test('no change: its confidence, nothing to do differently, the next review in sight; nothing to apply', async () => {
    await show();
    expect(screen.getByText(t('today.call.confidence.HIGH'))).toBeOnTheScreen();
    expect(screen.getByText(t('today.call.hold'))).toBeOnTheScreen();
    expect(screen.getByText(nextReview)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
  });

  test('not yet: no confidence — the label says "Wait" once — and keep logging the same way', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision('decision.no_decision_yet.wait_one_more_week', { action: { type: 'NO_DECISION_YET' } as Schemas['Decision']['action'], confidence: 'LOW' }),
    );
    await show();
    expect(screen.getAllByText(t('decision.no_decision_yet.label'))).toHaveLength(1);
    expect(screen.queryByText(t('today.call.confidence.LOW'))).toBeNull();
    expect(screen.getByText(t('today.call.waitNote'))).toBeOnTheScreen();
    expect(screen.getByText(nextReview)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
  });

  const change = (state: Schemas['Application']['state']) =>
    decision('decision.change_movement.bmr_floor', {
      id: 'd7',
      action: { type: 'CHANGE_MOVEMENT' } as Schemas['Decision']['action'],
      application: { state },
    });

  test('a change: one thing at a time, applied from today with one tap, and Today reads again', async () => {
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    await show();
    expect(screen.getByText(t('today.call.oneThing'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.hold'))).toBeNull();

    mockAnswers['/v1/decisions/current'] = ok(change('APPLIED'));
    const reads = mockGET.mock.calls.filter(([path]) => path === '/v1/decisions/current').length;
    await press(t('today.call.apply'));

    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/apply', { params: { path: { id: 'd7' } } });
    expect(mockGET.mock.calls.filter(([path]) => path === '/v1/decisions/current').length).toBe(reads + 1);
    expect(screen.getByText(t('decision.change_movement.applied'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
  });

  test('not applied: without a connection it says so and the button stays; refused, it says the call is past', async () => {
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    mockPost = 'offline';
    await show();
    await press(t('today.call.apply'));
    expect(screen.getByText(t('today.call.applyFailed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('today.call.apply') })).toBeOnTheScreen();

    mockPost = refused(409, 'CONFLICT');
    await press(t('today.call.apply'));
    expect(screen.getByText(t('today.call.applyRefused'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.applyFailed'))).toBeNull();
  });

  test.each([
    ['decision.stop_load_increase.plateau', 'STOP_LOAD_INCREASE'],
    ['decision.deload.long_stagnation', 'DELOAD'],
    ['decision.mini_cut.appetite_gone', 'MINI_CUT'],
  ])('a training or phase call that moves the plan (%s) is a change too: applied from today', async (copyKey, type) => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision(copyKey, { action: { type } as Schemas['Decision']['action'], application: { state: 'PENDING' } }),
    );
    await show();
    expect(screen.getByRole('button', { name: t('today.call.apply') })).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.hold'))).toBeNull();
  });

  test('advice that changes nothing (fix the habit that slipped) is its own words, not "nothing to do differently"', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision('decision.fix_adherence.adherence_low', { action: { type: 'FIX_ADHERENCE' } as Schemas['Decision']['action'] }),
    );
    await show();
    expect(screen.getByText(t('decision.fix_adherence.adherence_low.body'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.hold'))).toBeNull();
    expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
  });

  test('applied, each says what moved: a week off changes the program, a step goal the targets', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision('decision.full_rest_week.plan_missed', { action: { type: 'FULL_REST_WEEK' } as Schemas['Decision']['action'], application: { state: 'APPLIED' } }),
    );
    await show();
    expect(screen.getByText(t('decision.full_rest_week.applied'))).toBeOnTheScreen();
    expect(t('decision.full_rest_week.applied')).not.toEqual(t('decision.change_movement.applied'));
  });

  test.each([500, 503, 403])('refused for another reason (%i): something went wrong on our side, try again — the button stays', async (status) => {
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    mockPost = refused(status, status === 403 ? 'CONSENT_REQUIRED' : 'INTERNAL');
    await show();
    await press(t('today.call.apply'));
    expect(screen.getByText(t('today.call.applyError'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.applyRefused'))).toBeNull();
    expect(screen.getByRole('button', { name: t('today.call.apply') })).toBeOnTheScreen();
  });

  test('not applied is said for that read only: Today read again, the call is a new try', async () => {
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    mockPost = 'offline';
    await show();
    await press(t('today.call.apply'));
    expect(screen.getByText(t('today.call.applyFailed'))).toBeOnTheScreen();

    // Each read is parsed anew: the same call, a new object.
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    await act(async () => mockRefocus());
    expect(screen.queryByText(t('today.call.applyFailed'))).toBeNull();
    expect(screen.getByRole('button', { name: t('today.call.apply') })).toBeOnTheScreen();
  });

  test('two taps at once apply once', async () => {
    mockAnswers['/v1/decisions/current'] = ok(change('PENDING'));
    let answer: (value: Answer) => void = () => {};
    mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
    await show();
    const button = screen.getByRole('button', { name: t('today.call.apply') });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => answer(ok({})));
    expect(mockPOST).toHaveBeenCalledTimes(1);
  });

  test('a safety call is applied like any change, and still says nothing of why (ADR-028 #24)', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision('decision.change_phase.low_energy_safety', {
        action: { type: 'CHANGE_PHASE' } as Schemas['Decision']['action'],
        safety: true,
        application: { state: 'PENDING' },
      }),
    );
    await show();
    expect(screen.getByRole('button', { name: t('today.call.apply') })).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.hold'))).toBeNull();
    expect(allText()).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
  });

  test('undone: the plan is back as it was, and nothing to apply again', async () => {
    mockAnswers['/v1/decisions/current'] = ok(change('UNDONE'));
    await show();
    expect(screen.getByText(t('today.call.undone'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
  });
});

test('"Why this call" leads on to the data behind it: its own page, for this call', async () => {
  await show();
  await press(t('today.call.why'));
  await press(t('today.call.data'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/why', params: { id: 'd1' } });
});
