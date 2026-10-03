/**
 * The coach (K-509, prototype 2.1, ADR-043 #76): chips from the day's data, answered on the phone; a message sent to the
 * server, answered in the app's copy — a topic, the call's rule, that the call stands — with the call's card; the
 * engine's own words marked as such; the plan never changed from here (applying a call is Today's).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import CoachScreen from '@/app/coach';
import type { components } from '@/api/schema';
import { t } from '@/copy';
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
};
const CALL = { decisionId: 'd1', copyKey: 'decision.adjust_calories.not_toward_goal', nextReview: '2026-10-05' };
// Tuesday: a session today.
const PROGRAM: Schemas['Program'] = { id: 'p1', source: 'GENERATED', days: [{ id: 'a', nameKey: 'upper_a', weekday: 'TUESDAY', exercises: [] }] };

let mockAnswers: Record<string, Answer | 'offline'> = {};
let mockSent: Answer | 'offline' = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.call', call: CALL });
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockSent === 'offline') throw new TypeError('Network request failed');
  return mockSent;
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
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CoachScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

async function press(name: string) {
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
}

async function send(text: string) {
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.input')), text));
  await press(t('coach.send'));
}

test("on opening: chips from the day's data — the call, today's session, no weigh-in yet", async () => {
  await show();
  for (const chip of ['today.chips.why', 'today.chips.swap', 'today.chips.weighIn']) {
    expect(screen.getByRole('button', { name: t(chip) })).toBeOnTheScreen();
  }
  expect(mockGET).toHaveBeenCalledWith('/v1/weigh-ins', { params: { query: { from: '2026-09-29', to: '2026-09-29' } } });
});

test("'Why this call?' is answered on the phone: every rule's sentence, the call stands, its card — nothing sent", async () => {
  await show();
  await press(t('today.chips.why'));
  expect(screen.getByText(t('decision.rule.not_toward_goal'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.cut_step'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.adjust_calories.not_toward_goal.title'))).toBeOnTheScreen();
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

test('a chip from a link that is not one of ours is not answered', async () => {
  mockParams = { chip: 'settings.title' };
  await show();
  expect(screen.queryByText(t('settings.title'))).toBeNull();
});

test("a message: sent as written; the answer is the topic's sentence, the rule's, that the call stands — and the call", async () => {
  mockSent = ok({ mode: 'MODEL', topic: 'HUNGER', rule: 'cut_step', call: CALL });
  await show();
  await send('I am starving');
  expect(mockPOST).toHaveBeenCalledWith('/v1/coach/messages', { body: { text: 'I am starving' } });
  expect(screen.getByText('I am starving')).toBeOnTheScreen();
  expect(screen.getByText(t('coach.topic.hunger'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.cut_step'))).toBeOnTheScreen();
  expect(screen.getByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.adjust_calories.not_toward_goal.title'))).toBeOnTheScreen();
  expect(screen.queryByText(t('coach.standard'))).toBeNull();
  expect(screen.getByLabelText(t('coach.input')).props.value).toBe('');
});

test('a doctor brought up: the coach says only that the doctor comes first — not that the call stands (U6)', async () => {
  mockSent = ok({ mode: 'MODEL', topic: 'HEALTH', call: CALL });
  await show();
  await send('I started new medication');
  expect(screen.getByText(t('coach.topic.health'))).toBeOnTheScreen();
  expect(screen.queryByText(t('coach.answer.stands', { date: 'Mon, Oct 5' }))).toBeNull();
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
