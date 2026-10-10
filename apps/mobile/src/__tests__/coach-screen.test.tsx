/**
 * The coach (K-509, prototype 2.1, ADR-043 #76): chips from the day's data, answered on the phone; a message sent to the
 * server, answered in the app's copy — a topic, the call's rule, that the call stands — with the call's card; the
 * engine's own words marked as such; the plan never changed from here (applying a call is Today's).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import CoachScreen from '@/app/coach';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { handedFrom, takeMeal } from '@/food/handoff';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const DECISION: Schemas['Decision'] = {
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'ADJUST_CALORIES', kcalPerDay: -250 } as Schemas['Decision']['action'],
  reasons: [
    { rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } },
    { rule: 'cut_step', source: { tag: 'LITERATURE' } },
  ],
  confidence: 'MEDIUM',
  nextReview: '2026-10-05',
  copyKey: 'decision.adjust_calories.not_toward_goal',
  application: { state: 'PENDING' },
  declinable: false,
  changes: [],
};
const CALL = { decisionId: 'd1', copyKey: 'decision.adjust_calories.not_toward_goal', nextReview: '2026-10-05' };
// Tuesday: a session today.
const PROGRAM: Schemas['Program'] = { id: 'p1', source: 'GENERATED', days: [{ id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'TUESDAY', exercises: [] }] };

let mockAnswers: Record<string, Answer | 'offline'> = {};
let mockSent: Answer | 'offline' = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.call', call: CALL });
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockParsed: Answer | 'offline' = ok({ mode: 'DETERMINISTIC', items: [] });
const mockPOST = jest.fn(async (path: string, _init?: unknown) => {
  const answer = path === '/v1/meals/parse' ? mockParsed : mockSent;
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockPush = jest.fn();
let mockParams: { chip?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => {} },
  useLocalSearchParams: () => mockParams,
}));
const mockServices = { api: { GET: mockGET, POST: mockPOST }, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeAll(() => {
  // Tuesday 29 Sep 2026 on the phone's calendar; only the date is fake.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
      'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockAnswers = { '/v1/decisions/current': ok(DECISION), '/v1/program': ok(PROGRAM), '/v1/weigh-ins': ok([]) };
  mockSent = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.call', call: CALL });
  mockParsed = ok({ mode: 'DETERMINISTIC', items: [] });
  takeMeal();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CoachScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

/** How many times words are on screen: the week's note says the call first (K-517), so an answer adds one more. */
const count = (words: string) => screen.queryAllByText(words).length;

async function press(name: string) {
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
}

async function send(text: string) {
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.input')), text));
  await press(t('coach.send'));
}

test("on opening: three chips — the day's own first (the call, today's session), then a meal in words", async () => {
  await show();
  for (const chip of ['today.chips.why', 'today.chips.swap', 'coach.meal.chip']) {
    expect(screen.getByRole('button', { name: t(chip) })).toBeOnTheScreen();
  }
  expect(screen.queryByRole('button', { name: t('today.chips.weighIn') })).toBeNull();
  expect(mockGET).toHaveBeenCalledWith('/v1/weigh-ins', { params: { query: { from: '2026-09-29', to: '2026-09-29' } } });
});

test("the week's note opens the conversation: the call, its leading rule, the one focus with the call's own number (K-517)", async () => {
  await show();
  expect(screen.getByText(t('coach.note.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.not_toward_goal'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.note.focus.adjust_calories.less', { kcal: '250' }))).toBeOnTheScreen();
  expect(mockPOST).not.toHaveBeenCalled();
});

test('no call yet: no note', async () => {
  mockAnswers['/v1/decisions/current'] = refused(404, 'NOT_FOUND');
  await show();
  expect(screen.queryByText(t('coach.note.title'))).toBeNull();
});

test("'Why this call?' is answered on the phone: every rule's sentence, the call stands, its card — nothing sent", async () => {
  await show();
  const [rules, cards] = [count(t('decision.rule.not_toward_goal')), count(t('decision.adjust_calories.not_toward_goal.title'))];
  await press(t('today.chips.why'));
  expect(count(t('decision.rule.not_toward_goal'))).toBe(rules + 1);
  expect(screen.getByText(t('decision.rule.cut_step'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(count(t('decision.adjust_calories.not_toward_goal.title'))).toBe(cards + 1);
  expect(mockPOST).not.toHaveBeenCalled();
});

test("the call's card leads to why — and never applies the call: the plan changes from Today", async () => {
  await show();
  await press(t('today.chips.why'));
  await press(t('today.call.data'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/why', params: { id: 'd1' } });
  expect(screen.queryByRole('button', { name: t('today.call.apply') })).toBeNull();
});

test('a chip Today opened the coach with is answered at once', async () => {
  mockParams = { chip: 'today.chips.weighIn' };
  await show();
  expect(screen.getByText(t('coach.chip.weighIn'))).toBeOnTheScreen();
});

test("'Why this call?' from Today waits for the call: its rules and card, nothing sent", async () => {
  mockParams = { chip: 'today.chips.why' };
  await show();
  // The week's note and the chip's answer: each says the leading rule and shows the card.
  expect(count(t('decision.rule.not_toward_goal'))).toBe(2);
  expect(count(t('decision.adjust_calories.not_toward_goal.title'))).toBe(2);
  expect(mockPOST).not.toHaveBeenCalled();
});

test("'Why this call?' from Today while the call can't be read: says so — never that there is none", async () => {
  mockParams = { chip: 'today.chips.why' };
  mockAnswers['/v1/decisions/current'] = 'offline';
  await show();
  expect(screen.getByText(t('coach.chip.unread'))).toBeOnTheScreen();
  expect(screen.queryByText(t('coach.answer.no_call'))).toBeNull();
});

test('the swap leads on to today\'s session', async () => {
  await show();
  await press(t('today.chips.swap'));
  expect(screen.getByText(t('coach.chip.swap'))).toBeOnTheScreen();
  await press(t('coach.chip.openWorkout'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'a' } });
});

test('a chip from a link that is not one of ours is not answered', async () => {
  mockParams = { chip: 'settings.title' };
  await show();
  expect(screen.queryByText(t('settings.title'))).toBeNull();
});

test("a message: sent as written; the answer is the topic's sentence, the rule's, that the call stands — and the call", async () => {
  mockSent = ok({ mode: 'MODEL', topic: 'HUNGER', rule: 'cut_step', call: CALL });
  await show();
  const cards = count(t('decision.adjust_calories.not_toward_goal.title'));
  await send('I am starving');
  expect(mockPOST).toHaveBeenCalledWith('/v1/coach/messages', { body: { text: 'I am starving' } });
  expect(screen.getByText('I am starving')).toBeOnTheScreen();
  expect(screen.getByText(t('coach.topic.hunger'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.cut_step'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(count(t('decision.adjust_calories.not_toward_goal.title'))).toBe(cards + 1);
  expect(screen.queryByText(t('coach.standard'))).toBeNull();
  expect(screen.getByLabelText(t('coach.input')).props.value).toBe('');
});

test('a doctor brought up: the coach says only that the doctor comes first — not that the call stands (U6)', async () => {
  mockSent = ok({ mode: 'MODEL', topic: 'HEALTH', call: CALL });
  await show();
  const cards = count(t('decision.adjust_calories.not_toward_goal.title'));
  await send('I started new medication');
  expect(screen.getByText(t('coach.topic.health'))).toBeOnTheScreen();
  expect(screen.queryByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeNull();
  // Nor the call's card: the answer adds none — nothing says the call stands after the doctor (U6).
  expect(count(t('decision.adjust_calories.not_toward_goal.title'))).toBe(cards);
});

test("the engine's own words are marked as such — past the day's limit too", async () => {
  mockSent = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.daily_limit', call: CALL });
  await show();
  await send('Why?');
  expect(screen.getByText(t('coach.answer.daily_limit'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.standard'))).toBeOnTheScreen();
});

test('without the AI consent: one line and the way to Settings', async () => {
  mockSent = refused(403, 'CONSENT_REQUIRED');
  await show();
  await send('Why?');
  expect(screen.getByText(t('coach.consent'))).toBeOnTheScreen();
  await press(t('today.consent.open'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

test('without a subscription (K-703): one line and the way to the plans — never opened by itself', async () => {
  mockSent = refused(403, 'ENTITLEMENT_REQUIRED');
  await show();
  await send('Why?');
  expect(screen.getByText(t('coach.subscription'))).toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
  await press(t('subscription.seePlans'));
  expect(mockPush).toHaveBeenCalledWith('/paywall');
});

test('no answer: says so, and the same message is sent again on retry', async () => {
  mockSent = 'offline';
  await show();
  await send('Why?');
  expect(screen.getByText(t('coach.failed'))).toBeOnTheScreen();
  mockSent = ok({ mode: 'MODEL', topic: 'WHY', rule: 'cut_step', call: CALL });
  await press(t('coach.retry'));
  expect(mockPOST).toHaveBeenLastCalledWith('/v1/coach/messages', { body: { text: 'Why?' } });
  expect(screen.getByText(t('coach.topic.why'))).toBeOnTheScreen();
  expect(screen.queryByText(t('coach.failed'))).toBeNull();
  expect(screen.getAllByText('Why?')).toHaveLength(1);
});

test('a blank message is not sent; nothing is sent twice while one waits', async () => {
  let release: (answer: Answer) => void = () => {};
  mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (release = resolve)));
  await show();
  await send('   ');
  expect(mockPOST).not.toHaveBeenCalled();
  await send('Why?');
  await send('And more?');
  expect(mockPOST).toHaveBeenCalledTimes(1);
  await act(async () => release(ok({ mode: 'MODEL', topic: 'WHY', rule: 'cut_step', call: CALL })));
  expect(screen.getByText(t('coach.topic.why'))).toBeOnTheScreen();
});

test('a retry pressed while another message waits sends nothing more', async () => {
  mockSent = 'offline';
  await show();
  await send('Why?');
  let release: (answer: Answer) => void = () => {};
  mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (release = resolve)));
  await send('And this?');
  await press(t('coach.retry'));
  expect(mockPOST).toHaveBeenCalledTimes(2);
  await act(async () => release(ok({ mode: 'MODEL', topic: 'WHY', rule: 'cut_step', call: CALL })));
});

describe('a meal in words (K-504 draft)', () => {
  // No call this week: no note above, so nothing but the draft is on screen to read (its 'no calorie' too).
  beforeEach(() => {
    mockAnswers['/v1/decisions/current'] = refused(404, 'NOT_FOUND');
  });

  const EGGS = { food: 'eggs', amount: { quantity: 2, unit: 'piece' }, confident: true, candidates: [{ id: 'fdc-1', name: 'Egg, whole' }, { id: 'fdc-2', name: 'Egg white' }] };
  const TOAST = { food: 'toast', amount: { quantity: 1, unit: 'slice' }, confident: false, candidates: [{ id: 'fdc-7', name: 'Bread, white, toasted' }, { id: 'fdc-8', name: 'Bread, whole wheat, toasted' }] };

  async function tellMeal(text: string) {
    await press(t('coach.meal.chip'));
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.meal.input')), text));
    await press(t('coach.send'));
  }

  test('the chip asks for the meal; the words go to the meal reader, not to the coach', async () => {
    mockParsed = ok({ mode: 'MODEL', items: [EGGS] });
    await show();
    await press(t('coach.meal.chip'));
    expect(screen.getByText(t('coach.meal.prompt'))).toBeOnTheScreen();
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.meal.input')), 'two eggs'));
    await press(t('coach.send'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/meals/parse', { body: { text: 'two eggs' } });
    expect(mockPOST).not.toHaveBeenCalledWith('/v1/coach/messages', expect.anything());
    // Then the box is the coach's again.
    expect(screen.getByLabelText(t('coach.input'))).toBeOnTheScreen();
  });

  test("the draft: each food in the user's words and measure; a sure match picked, an unsure one asks — no calorie here (U1)", async () => {
    mockParsed = ok({ mode: 'MODEL', items: [EGGS, TOAST] });
    await show();
    await tellMeal('two eggs and toast');
    expect(screen.getByText(t('coach.meal.item', { food: 'eggs', quantity: '2', unit: 'piece' }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Egg, whole' })).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    expect(screen.getByText(t('coach.meal.pick'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('coach.meal.log') })).toBeDisabled();
    expect(allText()).not.toMatch(/kcal/i);
  });

  test('one tap each: the picks go to the meal screen in memory, not in the link', async () => {
    mockParsed = ok({ mode: 'MODEL', items: [EGGS, TOAST] });
    await show();
    await tellMeal('two eggs and toast');
    await press('Bread, whole wheat, toasted');
    await press(t('coach.meal.log'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
    expect(handedFrom()).toBe('coach'); // a meal in words never gives the photo's reason
    expect(takeMeal()).toEqual([
      { foodId: 'fdc-1', name: 'Egg, whole', quantity: 2, unit: 'piece' },
      { foodId: 'fdc-8', name: 'Bread, whole wheat, toasted', quantity: 1, unit: 'slice' },
    ]);
  });

  test("a meal the reader couldn't read — or past the day's limit — says so, and the meal screen is a tap away", async () => {
    mockParsed = ok({ mode: 'DETERMINISTIC', items: [] });
    await show();
    await tellMeal('mmm');
    expect(screen.getByText(t('coach.meal.unread'))).toBeOnTheScreen();
    await press(t('coach.meal.byName'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
    expect(takeMeal()).toBeNull();
  });

  test('a food the database has nothing for is left to the meal screen; the rest go over', async () => {
    const STEW = { food: 'stew', amount: { quantity: 1, unit: 'bowl' }, confident: false, candidates: [] };
    mockParsed = ok({ mode: 'MODEL', items: [EGGS, STEW] });
    await show();
    await tellMeal('eggs and stew');
    expect(screen.getByText(t('coach.meal.noMatch', { food: 'stew' }))).toBeOnTheScreen();
    await press(t('coach.meal.log'));
    expect(takeMeal()).toEqual([{ foodId: 'fdc-1', name: 'Egg, whole', quantity: 2, unit: 'piece' }]);
  });

  test('nothing the database has: nothing to hand over, the meal screen by name', async () => {
    mockParsed = ok({ mode: 'MODEL', items: [{ ...TOAST, candidates: [] }] });
    await show();
    await tellMeal('mystery stew');
    expect(screen.getByRole('button', { name: t('coach.meal.log') })).toBeDisabled();
    await press(t('coach.meal.byName'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
  });

  test("a retry above a draft keeps the draft's picks", async () => {
    mockSent = 'offline';
    await show();
    await send('Why?');
    mockParsed = ok({ mode: 'MODEL', items: [TOAST] });
    await tellMeal('toast');
    await press('Bread, whole wheat, toasted');
    mockSent = ok({ mode: 'MODEL', topic: 'WHY', rule: 'cut_step', call: CALL });
    await press(t('coach.retry'));
    expect(screen.getByRole('button', { name: 'Bread, whole wheat, toasted' })).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    await press(t('coach.meal.log'));
    expect(takeMeal()).toEqual([{ foodId: 'fdc-8', name: 'Bread, whole wheat, toasted', quantity: 1, unit: 'slice' }]);
  });

  test('a meal in words without a subscription: its own line (logging by name still works) and the way to the plans', async () => {
    mockParsed = refused(403, 'ENTITLEMENT_REQUIRED');
    await show();
    await tellMeal('two eggs');
    expect(screen.getByText(t('coach.mealSubscription'))).toBeOnTheScreen();
    expect(screen.queryByText(t('coach.subscription'))).toBeNull();
    await press(t('subscription.seePlans'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  test('without the consents: the consent line; no answer: retry reads the meal again', async () => {
    mockParsed = refused(403, 'CONSENT_REQUIRED');
    await show();
    await tellMeal('two eggs');
    expect(screen.getByText(t('coach.consent'))).toBeOnTheScreen();
    mockParsed = 'offline';
    await tellMeal('two eggs');
    mockParsed = ok({ mode: 'MODEL', items: [EGGS] });
    await press(t('coach.retry'));
    expect(mockPOST).toHaveBeenLastCalledWith('/v1/meals/parse', { body: { text: 'two eggs' } });
    expect(screen.getByRole('button', { name: t('coach.meal.log') })).toBeEnabled();
  });
});

function allText(): string {
  return screen.toJSON() === null ? '' : JSON.stringify(screen.toJSON());
}

// K-815: VoiceOver hears only what it is on; the wait, the answer and a failure appear below it, so they are announced.
const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

test('VoiceOver hears the wait, then the answer in its own words (K-815)', async () => {
  mockSent = ok({ mode: 'MODEL', topic: 'HUNGER', rule: 'cut_step', call: CALL });
  await show();
  announced.mockClear();
  await send('I am starving');
  const words = announced.mock.calls.map(([line]) => line);
  expect(words[0]).toBe(t('coach.thinking'));
  expect(words[1]).toContain(t('coach.topic.hunger'));
  expect(words[1]).toContain(t('decision.rule.cut_step'));
  expect(words).toHaveLength(2);
});

test('VoiceOver hears an answer that did not come, and a missing consent (K-815)', async () => {
  mockSent = 'offline';
  await show();
  announced.mockClear();
  await send('Why?');
  expect(announced).toHaveBeenLastCalledWith(t('coach.failed'));
  mockSent = refused(403, 'CONSENT_REQUIRED');
  await press(t('coach.retry'));
  expect(announced).toHaveBeenLastCalledWith(t('coach.consent'));
});

test("VoiceOver hears a chip's answer, and the engine's mark on it (K-815)", async () => {
  mockSent = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.daily_limit', call: CALL });
  await show();
  announced.mockClear();
  await press(t('today.chips.why'));
  expect(announced).toHaveBeenCalledTimes(1);
  expect(announced.mock.calls[0][0]).toContain(t('decision.rule.cut_step'));
  await send('Why?');
  expect(announced.mock.calls.at(-1)?.[0]).toContain(t('coach.standard'));
});
