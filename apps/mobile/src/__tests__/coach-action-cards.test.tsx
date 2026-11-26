/**
 * The coach's action cards (K-1236, ADR-092 Ek 2 #2, ADR-094 §3): only what the engine already worked out, the coach does not
 * make one up (U1). The walk is the steps left as Today read them, against the user's own routes (K-1216); "Add to plan" sets
 * today's evening walk reminder and nothing else. The meal is what fits what is left today (GET /v1/days/{day}/suggestions);
 * "Log" takes it to the meal screen as a draft. No suggestion, no card; both work with the model off. Coral ground, petrol button.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import CoachScreen from '@/app/coach';
import budgets from '../../../../data/copy/word-budgets.json';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { peekMeal, takeMeal } from '@/food/handoff';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

import { wordsOf } from './support/copyBudget';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const WALK = { day: '2026-09-29', remaining: 4000, body: '4,000 steps left today. Gym and back is about 30 minutes of walking.', at: '18:00', planned: false };
const SUGGESTION: Schemas['Suggestion'] = {
  foodId: 'f1',
  name: 'Greek yogurt',
  amount: { quantity: 200, unit: 'g' },
  kcal: { low: 180, high: 200 },
  proteinG: { low: 18, high: 20 },
};

let mockAnswers: Record<string, Answer> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? refused(404, 'NOT_FOUND'));
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => ok({}));
const mockPUT = jest.fn(async (_path: string, _init?: unknown) => ok({}));
let mockWalk: typeof WALK | null = WALK;
let mockPlanned: 'set' | 'off' | 'late' | 'quiet' | 'none' = 'set';
const mockReminders = {
  walkToday: jest.fn(async () => mockWalk),
  planWalkToday: jest.fn(async () => mockPlanned),
  setWalk: jest.fn(async () => {}),
};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => {} },
  useLocalSearchParams: () => ({}),
}));
const mockServices = { api: { GET: mockGET, POST: mockPOST, PUT: mockPUT }, reminders: mockReminders, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeAll(() => {
  // Tuesday 29 Sep 2026, morning, on the phone's calendar; only the date is fake.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
      'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockWalk = WALK;
  mockPlanned = 'set';
  mockAnswers = { '/v1/decisions/current': refused(404, 'NOT_FOUND'), '/v1/days/{day}/suggestions': ok([SUGGESTION]) };
  takeMeal();
});

async function show(scheme: 'light' | 'dark' = 'light') {
  await render(
    <ThemeProvider scheme={scheme}>
      <CoachScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const card = (id: 'walk' | 'meal') => within(screen.getByTestId(`coach-action-${id}`));
const flat = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as { backgroundColor?: string };

describe('the walk card', () => {
  test("the steps left, as Today read them, with today's evening reminder on offer", async () => {
    await show();
    expect(card('walk').getByText(t('coach.action.walk.title'))).toBeOnTheScreen();
    expect(card('walk').getByText(WALK.body)).toBeOnTheScreen();
    expect(card('walk').getByRole('button', { name: t('coach.action.walk.add') })).toBeOnTheScreen();
  });

  test('"Add to plan" sets that reminder alone: nothing is sent, the plan, the call and the switch are left as they are', async () => {
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(mockReminders.planWalkToday).toHaveBeenCalledTimes(1);
    expect(mockReminders.setWalk).not.toHaveBeenCalled();
    expect(mockPOST).not.toHaveBeenCalled();
    expect(mockPUT).not.toHaveBeenCalled();
    expect(card('walk').getByText(t('coach.action.walk.set', { time: '18:00' }))).toBeOnTheScreen();
    expect(card('walk').queryByRole('button', { name: t('coach.action.walk.add') })).toBeNull();
  });

  test('already planned today: says so, no button', async () => {
    mockWalk = { ...WALK, planned: true };
    await show();
    expect(card('walk').getByText(t('coach.action.walk.set', { time: '18:00' }))).toBeOnTheScreen();
    expect(card('walk').queryByRole('button', { name: t('coach.action.walk.add') })).toBeNull();
  });

  test('reminders off or not allowed: says so, and the way is Settings', async () => {
    mockPlanned = 'off';
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(card('walk').getByText(t('coach.action.walk.off'))).toBeOnTheScreen();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.settings') })));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  test('past the time: says no reminder today', async () => {
    mockPlanned = 'late';
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(card('walk').getByText(t('coach.action.walk.late', { time: '18:00' }))).toBeOnTheScreen();
  });

  test('the reminder could not be set: says so, and it can be asked again', async () => {
    mockReminders.planWalkToday.mockRejectedValueOnce(new Error('scheduling'));
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(card('walk').getByText(t('coach.action.walk.failed'))).toBeOnTheScreen();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(card('walk').getByText(t('coach.action.walk.set', { time: '18:00' }))).toBeOnTheScreen();
  });

  test('a declared state quiets today: says so, no button', async () => {
    mockPlanned = 'quiet';
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(card('walk').getByText(t('coach.action.walk.quiet'))).toBeOnTheScreen();
    expect(card('walk').queryByRole('button', { name: t('coach.action.walk.add') })).toBeNull();
  });

  test('nothing left to walk by the time it is pressed (past midnight, a new read): the card goes', async () => {
    mockPlanned = 'none';
    await show();
    await act(async () => fireEvent.press(card('walk').getByRole('button', { name: t('coach.action.walk.add') })));
    expect(screen.queryByTestId('coach-action-walk')).toBeNull();
  });

  test('nothing read today, or too few steps left: no walk card', async () => {
    mockWalk = null;
    await show();
    expect(screen.queryByTestId('coach-action-walk')).toBeNull();
    await screen.unmount();
    mockWalk = { ...WALK, remaining: 1999 };
    await show();
    expect(screen.queryByTestId('coach-action-walk')).toBeNull();
  });
});

describe('the meal card', () => {
  test("what fits what is left: the user's own food in their usual amount, read for today", async () => {
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/days/{day}/suggestions', { params: { path: { day: '2026-09-29' } } });
    expect(card('meal').getByText(t('coach.action.meal.title'))).toBeOnTheScreen();
    expect(card('meal').getByText(t('food.suggestions.item', { name: 'Greek yogurt', quantity: '200', unit: 'g' }))).toBeOnTheScreen();
  });

  test('"Log" takes it to the meal screen as a draft; nothing is logged from here', async () => {
    await show();
    await act(async () => fireEvent.press(card('meal').getByRole('button', { name: t('coach.action.meal.log') })));
    expect(peekMeal()).toEqual([{ foodId: 'f1', name: 'Greek yogurt', quantity: 200, unit: 'g' }]);
    expect(mockPush).toHaveBeenCalledWith('/meal');
    expect(mockPOST).not.toHaveBeenCalled();
  });

  test.each([
    ['none fits', ok([])],
    ['the day cannot be read', refused(500, 'X')],
    ['no health data consent', refused(403, 'CONSENT_REQUIRED')],
  ])('no meal card when %s', async (_, answer) => {
    mockAnswers['/v1/days/{day}/suggestions'] = answer;
    await show();
    expect(screen.queryByTestId('coach-action-meal')).toBeNull();
  });
});

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  const p = palettes[scheme];
  test("the engine's suggested action: coral ground, a petrol button (ADR-094 §3)", async () => {
    await show(scheme);
    for (const id of ['walk', 'meal'] as const) {
      expect(flat(screen.getByTestId(`coach-action-${id}`)).backgroundColor).toBe(p.tintSuggest);
    }
  });
});

test('each card stays within the coach card budget (word-budgets.json, coachActionMaxWords)', () => {
  const max = budgets.coachActionMaxWords;
  expect(max).toBeGreaterThan(0);
  for (const words of [
    [t('coach.action.walk.title'), t('coach.action.walk.add')],
    [t('coach.action.walk.title'), t('coach.action.walk.off'), t('coach.action.walk.settings')],
    [t('coach.action.walk.title'), t('coach.action.walk.late', { time: '18:00' })],
    [t('coach.action.walk.title'), t('coach.action.walk.set', { time: '18:00' })],
    [t('coach.action.walk.title'), t('coach.action.walk.quiet')],
    [t('coach.action.meal.title'), t('coach.action.meal.log')],
  ]) {
    expect(wordsOf(words.join(' '))).toBeLessThanOrEqual(max);
  }
});
