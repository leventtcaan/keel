/**
 * Coming back (K-981, ADR-077 #5 and Ek 6, Ek 8; prototype #return): after a gap in the log the app opens on three ways
 * to go on, the one the server suggests first. Nothing here decides: the gap, whether to ask and which to suggest are the
 * server's (GET /v1/return); the answer is POSTed and the screen is left for the result, not a toast. The words are
 * honest: the plan, the logs and the goals are kept, and nothing is said about a streak.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ReturnScreen from '@/app/return';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Summary = Schemas['ReturnSummary'];

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const failed = (status: number) => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });

let mockSummary: Summary;
let mockProgram: Schemas['Program'];
let mockGetStatus: number | 'offline' = 200;
let mockPostFails: number | 'offline' | null = null;
const mockGet = jest.fn(async (path: string) => {
  if (path !== '/v1/return') return failed(404);
  if (mockGetStatus === 'offline') throw new TypeError('network');
  return mockGetStatus === 200 ? ok(mockSummary) : failed(mockGetStatus);
});
const mockPost = jest.fn(async (_path: string, init: { body: { choice: string } }) => {
  if (mockPostFails === 'offline') throw new TypeError('network');
  if (mockPostFails !== null) return failed(mockPostFails);
  return ok({ ...mockSummary, shouldPrompt: false, ...(init.body.choice === 'PICK_UP' ? { suggested: 'PICK_UP' } : {}) });
});
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockReport = jest.fn();

jest.mock('expo-router', () => ({ router: { back: () => mockBack(), replace: (...args: unknown[]) => mockReplace(...args) } }));
// One object for the life of the test, as the real services are built once per process: the screen reads on it.
const mockServices = {
  api: { GET: mockGet, POST: mockPost },
  training: {
    read: async () => ({
      program: { state: 'ready', value: mockProgram },
      exercises: {
        state: 'ready',
        value: ['squat', 'bench_press'].map((id) => ({ id, nameKey: `exercises.${id}.name`, kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] })),
      },
      kept: false,
    }),
  },
  report: mockReport,
};
jest.mock('@/services/ServicesProvider', () => ({ useUnits: () => 'METRIC', useAppServices: () => mockServices }));

const planned = (exerciseId: string, nextLoadKg: number): Schemas['PlannedExercise'] => ({
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  nextLoadKg,
});
const programWith = (backAfterBreak: boolean): Schemas['Program'] => ({
  id: 'p',
  source: 'GENERATED',
  ...(backAfterBreak ? { backAfterBreak } : {}),
  days: [{ id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'MONDAY', exercises: [planned('squat', 95), planned('bench_press', 70)] }],
});

// One week away: Pick up is suggested. Three weeks: Ease back in.
const WEEK: Summary = { awayDays: 8, shouldPrompt: true, suggested: 'PICK_UP', nextCallOn: '2027-01-25' };
const THREE_WEEKS: Summary = { awayDays: 22, shouldPrompt: true, suggested: 'EASE_BACK', nextCallOn: '2027-01-25' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSummary = WEEK;
  mockProgram = programWith(false);
  mockGetStatus = 200;
  mockPostFails = null;
});

async function show() {
  await render(
    <ThemeProvider>
      <ReturnScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const option = (title: string) => screen.getByRole('radio', { name: new RegExp(`^${title}`) });
const pick = async (title: string) => {
  await fireEvent.press(option(title));
  await act(async () => {});
};
const go = async () => {
  await fireEvent.press(screen.getByRole('button', { name: t('return.continue') }));
  await act(async () => {});
};
const EASE = t('return.ease.title');
const PICK_UP = t('return.pickUp.title');
const REBUILD = t('return.rebuild.title');

describe('what it shows', () => {
  test('a welcome that says what is kept (the plan, the logs, the goals), the days away, and three ways to go on', async () => {
    await show();
    expect(screen.getByRole('header', { name: t('return.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('return.away.other', { days: 8 }))).toBeOnTheScreen();
    for (const title of [EASE, PICK_UP, REBUILD]) expect(option(title)).toBeOnTheScreen();
  });

  test('honest words: no "nothing lost", no streak, no blame (ADR-077 Ek 6, U7)', async () => {
    await show();
    const shown = JSON.stringify(screen.toJSON());
    expect(shown).not.toMatch(/nothing lost/i);
    expect(shown).not.toMatch(/streak|missed|behind|failed/i);
    expect(t('return.away.other', { days: 8 })).toMatch(/plan/i);
    expect(t('return.away.other', { days: 8 })).toMatch(/logs/i);
    expect(t('return.away.other', { days: 8 })).toMatch(/goals/i);
  });

  test('a week away: Pick up where I left off is the suggested one, and is chosen to begin with', async () => {
    await show();
    expect(option(PICK_UP).props.accessibilityState).toMatchObject({ checked: true });
    expect(option(PICK_UP).props.accessibilityLabel).toContain(t('return.suggested'));
    expect(option(EASE).props.accessibilityState).toMatchObject({ checked: false });
    expect(option(EASE).props.accessibilityLabel).not.toContain(t('return.suggested'));
    expect(screen.getAllByText(t('return.suggested'))).toHaveLength(1);
  });

  test('three weeks away: Ease back in is the suggested one, chosen to begin with, with the weights the server set', async () => {
    mockSummary = THREE_WEEKS;
    mockProgram = programWith(true);
    await show();
    expect(option(EASE).props.accessibilityState).toMatchObject({ checked: true });
    expect(option(EASE).props.accessibilityLabel).toContain(t('return.suggested'));
    expect(option(PICK_UP).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText(t('return.ease.body', { moves: `${t('exercises.squat.name')} ${t('units.kg', { value: 95 })}, ${t('exercises.bench_press.name')} ${t('units.kg', { value: 70 })}` }))).toBeOnTheScreen();
  });

  test('where the program shows no lighter targets, Ease back in names no weights (they would be the usual ones)', async () => {
    await show();
    expect(screen.getByText(t('return.ease.plain'))).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(t('units.kg', { value: 95 })))).toBeNull();
  });

  test('Next call is the server\'s day, written as a date', async () => {
    await show();
    expect(screen.getByText(t('return.nextCall', { date: 'Mon, Jan 25' }))).toBeOnTheScreen();
  });

  test('no next call from the server (no health data consent): no such line', async () => {
    mockSummary = { awayDays: 8, shouldPrompt: true, suggested: 'PICK_UP' };
    await show();
    expect(screen.queryByText(/Next call/)).toBeNull();
  });

  test('not asked (the server says so): nothing is shown and the screen is left', async () => {
    mockSummary = { ...WEEK, shouldPrompt: false };
    await show();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: t('return.continue') })).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('the answer', () => {
  test('Continue sends the suggested choice and the screen changes: back to where the app is, no toast', async () => {
    mockSummary = THREE_WEEKS;
    await show();
    await go();
    expect(mockPost).toHaveBeenCalledWith('/v1/return', { body: { choice: 'EASE_BACK' } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('a different choice is the one sent', async () => {
    mockSummary = THREE_WEEKS;
    await show();
    await pick(PICK_UP);
    await go();
    expect(mockPost).toHaveBeenCalledWith('/v1/return', { body: { choice: 'PICK_UP' } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('Rebuild my plan is answered, then the rebuild page opens in its place (its own confirmation replaces the program)', async () => {
    await show();
    await pick(REBUILD);
    await go();
    expect(mockPost).toHaveBeenCalledWith('/v1/return', { body: { choice: 'REBUILD' } });
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part: 'rebuild' } });
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('two taps while it is on its way answer once', async () => {
    let finish: () => void = () => {};
    mockPost.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve(ok({ ...WEEK, shouldPrompt: false })))));
    await show();
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(screen.getByRole('button', { name: t('return.continue') }));
        void fireEvent.press(screen.getByRole('button', { name: t('return.continue') }));
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockPost).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('not answered (no connection): it says so, stays, and a second try sends it again', async () => {
    mockPostFails = 'offline';
    await show();
    await go();
    expect(screen.getByText(t('return.noConnection'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    mockPostFails = null;
    await go();
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('not answered (the server refused): it says so, by name only, and stays', async () => {
    mockPostFails = 409;
    await show();
    await go();
    expect(screen.getByText(t('return.refused'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'ReturnRefused' });
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('a way out that answers nothing (ADR-077 #5: suggest, never insist)', () => {
  const notNow = () => screen.getByRole('button', { name: t('return.later') });

  test('Not now, with the three ways to go on in view: nothing is sent, the screen is left (the server asks again next time)', async () => {
    await show();
    await fireEvent.press(notNow());
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the answer could not be sent (no connection): Not now still leaves, with nothing recorded', async () => {
    mockPostFails = 'offline';
    await show();
    await go();
    expect(screen.getByText(t('return.noConnection'))).toBeOnTheScreen();
    await fireEvent.press(notNow());
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('while it is still reading (the server does not answer): a loading mark, not a blank page, and Not now leaves', async () => {
    mockGet.mockImplementationOnce(() => new Promise(() => {}));
    await show();
    expect(screen.getByLabelText(t('return.loading'))).toBeOnTheScreen();
    await fireEvent.press(notNow());
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('while an answer is on its way, Not now waits (the last choice made is the one recorded)', async () => {
    mockPost.mockImplementationOnce(() => new Promise(() => {}));
    await show();
    await go();
    expect(notNow()).toBeDisabled();
  });
});

describe('Pick up where I left off says what the server does: the program\'s targets as they are', () => {
  test('no promise of the last loads (PICK_UP keeps the targets, which may be a step on from the last set)', async () => {
    await show();
    expect(screen.getByText(t('return.pickUp.body'))).toBeOnTheScreen();
    expect(t('return.pickUp.body')).toMatch(/target/i);
    expect(t('return.pickUp.body')).not.toMatch(/before|weights/i);
  });
});

describe('when it cannot read', () => {
  test('no connection: says so and offers to try again, which reads again', async () => {
    mockGetStatus = 'offline';
    await show();
    expect(screen.getByText(t('return.noConnection'))).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).toBeNull();
    mockGetStatus = 200;
    await fireEvent.press(screen.getByRole('button', { name: t('return.retry') }));
    await act(async () => {});
    expect(option(PICK_UP)).toBeOnTheScreen();
  });
});
