/**
 * The call screen (K-978, ADR-077 #3, prototype #call): one layer. Its label, its one line, the plan's state ("In this
 * week's plan"), two reasons each with its kind of source (U14), the confidence and the next call's date (U3's parts), Got
 * it, and the one second way: "Keep last week's plan" where the server allows it (never on a safety call, U13), "Use this
 * call" back. A past call opens on the same screen, read only. After a change the screen reads the call again: it shows
 * what changed, not a toast.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import CallScreen from '@/app/call';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const decision = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-28',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [
    { rule: 'plateau', source: { tag: 'EXPERIENCE' } },
    { rule: 'toward_goal', source: { tag: 'LITERATURE' } },
    { rule: 'energy_floor', source: { tag: 'PRODUCT' } },
  ],
  confidence: 'MEDIUM',
  nextReview: '2027-01-04',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
  changes: [],
  ...extra,
});

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockPost: Answer | 'offline' = ok({});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPost === 'offline') throw new TypeError('Network request failed');
  return mockPost;
});
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: { id?: string; from?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (to: string) => mockPush(to) },
  useLocalSearchParams: () => mockParams,
}));
const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const mockServices = { api: { GET: mockGET, POST: mockPOST }, report: jest.fn() };
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUnits = 'METRIC';
  mockPost = ok({});
  mockAnswers = { '/v1/decisions/current': ok(decision()) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CallScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
beforeAll(async () => {
  mockAnswers = { '/v1/decisions/current': ok(decision()) };
  await show();
  await screen.unmount();
}, 30_000);
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};

describe("this week's call", () => {
  test('its label, its one line, the plan\'s state, two reasons with their kind of source, confidence and the next call', async () => {
    await show();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.stop_load_increase.plateau.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.inPlan'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.rule.plateau'))).toBeOnTheScreen();
    expect(screen.getByText(t('decision.rule.toward_goal'))).toBeOnTheScreen();
    expect(screen.queryByText(t('decision.rule.energy_floor'))).toBeNull(); // two, no more
    expect(screen.getByLabelText(t('today.call.source.EXPERIENCE'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('today.call.source.LITERATURE'))).toBeOnTheScreen();
    // The kind of source is a symbol with its full words for VoiceOver, not a line of text (U14, the word budget)
    expect(screen.queryByText(t('today.call.source.EXPERIENCE'))).toBeNull();
    expect(screen.queryByText(t('today.call.source.LITERATURE'))).toBeNull();
    expect(screen.getByText(t('callScreen.confidence', { level: t('callScreen.level.MEDIUM') }))).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.nextCall', { date: 'Mon, Jan 4' }))).toBeOnTheScreen();
    expect(screen.getByText('Mon, Dec 28')).toBeOnTheScreen(); // the day it was made
  });

  test('"Got it" goes back to the week', async () => {
    await show();
    await press(t('callScreen.gotIt'));
    expect(mockBack).toHaveBeenCalled();
  });

  test('"Keep last week\'s plan": the call stays on record, not applied; the screen says so, and "Use this call" brings it back', async () => {
    await show();
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'DECLINED' }, declinable: false }));
    await press(t('callScreen.keep'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/decline', { params: { path: { id: 'd1' } } });
    expect(screen.getByText(t('callScreen.notApplied'))).toBeOnTheScreen();
    expect(screen.queryByText(t('callScreen.inPlan'))).toBeNull();
    // The call itself does not change (U2): its label and line stay.
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();

    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('callScreen.use'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/decisions/{id}/apply', { params: { path: { id: 'd1' } } });
    expect(screen.getByText(t('callScreen.inPlan'))).toBeOnTheScreen();
  });

  test('a call resting on the safety net: no second way, and none of its reasons said (ADR-028 #24)', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision({
        copyKey: 'decision.change_phase.low_energy_safety',
        action: { type: 'CHANGE_PHASE', to: 'BULK' } as Schemas['Decision']['action'],
        safety: true,
        declinable: false,
        reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' } }],
      }),
    );
    await show();
    expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();
    expect(screen.queryByText(t('decision.rule.low_energy_safety'))).toBeNull();
    expect(screen.getByText(t('today.call.source.LITERATURE'))).toBeOnTheScreen(); // no sentence: the kind of source in words
    // The mark beside it would say the same words again: VoiceOver reads them once, from the line.
    expect(screen.queryByLabelText(t('today.call.source.LITERATURE'))).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
  });

  test('not yet: no confidence to give', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision({ copyKey: 'decision.no_decision_yet.window_not_full', action: { type: 'NO_DECISION_YET' } as Schemas['Decision']['action'], declinable: false, application: { state: 'NOT_NEEDED' } }),
    );
    await show();
    expect(screen.queryByText(/^Confidence/)).toBeNull();
    expect(screen.queryByText(t('callScreen.inPlan'))).toBeNull();
  });

  test('not kept (no connection): said so, the button stays', async () => {
    await show();
    mockPost = 'offline';
    await press(t('callScreen.keep'));
    expect(screen.getByText(t('callScreen.keepFailed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('callScreen.keep') })).toBeOnTheScreen();
  });

  test('refused (409: the call past changing): the call read again, then said so on it as it now is, no dead button', async () => {
    await show();
    mockPost = refused(409, 'CONFLICT');
    // A newer state on the server: the call no longer declinable.
    mockAnswers['/v1/decisions/current'] = ok(decision({ declinable: false }));
    const reads = mockGET.mock.calls.length;
    await press(t('callScreen.keep'));
    expect(mockGET.mock.calls.length).toBe(reads + 1);
    expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();
    expect(screen.getByText(t('callScreen.keepRefused'))).toBeOnTheScreen();
  });

  test('kept, or used again: the new state is said aloud too (VoiceOver, K-815)', async () => {
    await show();
    mockAnswers['/v1/decisions/current'] = ok(decision({ application: { state: 'DECLINED' }, declinable: false }));
    await press(t('callScreen.keep'));
    expect(said).toHaveBeenCalledWith(t('callScreen.notApplied'));
    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('callScreen.use'));
    expect(said).toHaveBeenCalledWith(t('callScreen.inPlan'));
  });

  test('without the health data consent: said as the consent, with the way to Settings', async () => {
    mockAnswers['/v1/decisions/current'] = refused(403, 'CONSENT_REQUIRED');
    await show();
    expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
    await press(t('today.consent.open'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    expect(screen.queryByText(t('callScreen.failed'))).toBeNull();
  });

  test('without a subscription: the way to the plans', async () => {
    mockAnswers['/v1/decisions/current'] = refused(403, 'ENTITLEMENT_REQUIRED');
    await show();
    expect(screen.getByText(t('callScreen.subscription'))).toBeOnTheScreen();
    await press(t('subscription.seePlans'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  test('no call yet (404): its own line, not a fault', async () => {
    mockAnswers['/v1/decisions/current'] = refused(404, 'NOT_FOUND');
    await show();
    expect(screen.getByText(t('callScreen.none'))).toBeOnTheScreen();
    expect(screen.queryByText(t('callScreen.failed'))).toBeNull();
  });

  test('two taps at once send once', async () => {
    let answer: (value: Answer) => void = () => {};
    mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
    await show();
    const button = screen.getByRole('button', { name: t('callScreen.keep') });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => answer(ok({})));
    expect(mockPOST).toHaveBeenCalledTimes(1);
  });

  test('could not be read: said so, and trying again reads again', async () => {
    mockAnswers['/v1/decisions/current'] = 'offline';
    await show();
    expect(screen.getByText(t('callScreen.failed'))).toBeOnTheScreen();
    mockAnswers['/v1/decisions/current'] = ok(decision());
    await press(t('callScreen.retry'));
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
  });
});

describe('what the call changes, and why in a line (K-978 part 2)', () => {
  const calories = (extra: Partial<Schemas['Decision']> = {}) =>
    decision({
      copyKey: 'decision.adjust_calories.not_toward_goal',
      action: { type: 'ADJUST_CALORIES', kcalPerDay: -250 } as Schemas['Decision']['action'],
      reasons: [
        { rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' }, facts: { kgPerWeek: -0.1, weeks: 3 } },
        { rule: 'cut_step', source: { tag: 'LITERATURE' }, facts: { kcal: 250 } },
        { rule: 'energy_floor', source: { tag: 'PRODUCT' } },
      ],
      changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 } }],
      ...extra,
    });

  test('the changes, old to new, one line each; VoiceOver hears them as one sentence', async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories());
    await show();
    expect(screen.getByText('Calories')).toBeOnTheScreen();
    expect(screen.getByText('2,100')).toBeOnTheScreen();
    expect(screen.getByText('1,850 kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Calories: was 2,100 kcal, now 1,850 kcal')).toBeOnTheScreen();
  });

  test('no target was in force: a new target, no number before it', async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories({ changes: [{ what: 'CALORIES', before: {}, after: { targetKcal: 1850 } }] }));
    await show();
    expect(screen.getByText('Calories, new')).toBeOnTheScreen();
    expect(screen.getByText('1,850 kcal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Calories, new: 1,850 kcal')).toBeOnTheScreen();
  });

  test("kept off the plan: the target in force is what shows; the call's own number is not", async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      calories({
        application: { state: 'DECLINED' },
        declinable: false,
        changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 }, inForce: { targetKcal: 2100 } }],
      }),
    );
    await show();
    expect(screen.getByText('Calories, in force')).toBeOnTheScreen();
    expect(screen.getByText('2,100 kcal')).toBeOnTheScreen();
    expect(screen.queryByText('1,850 kcal')).toBeNull();
  });

  test('not applied yet (pending) or a call that moves no target: no changes section', async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories({ application: { state: 'PENDING' }, changes: [] }));
    await show();
    expect(screen.queryByText('Calories')).toBeNull();
    expect(screen.getByRole('button', { name: t('callScreen.use') })).toBeOnTheScreen();
  });

  test("the two reasons in a line each, with the server's numbers, and their kind of source", async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories());
    await show();
    expect(screen.getByText('-0.1 kg a week over 3 weeks, not toward your goal.')).toBeOnTheScreen();
    expect(screen.getByText('One step: 250 kcal a day less.')).toBeOnTheScreen();
    expect(screen.queryByText(t('decision.ruleShort.energy_floor'))).toBeNull(); // two, no more
    expect(screen.getByLabelText(t('today.call.source.EXPERIENCE'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('today.call.source.LITERATURE'))).toBeOnTheScreen();
    expect(screen.queryByText(t('today.call.source.EXPERIENCE'))).toBeNull();
  });

  test("the pace in the user's units: pounds on a pound screen, never a kilogram", async () => {
    mockUnits = 'IMPERIAL';
    mockAnswers['/v1/decisions/current'] = ok(calories());
    await show();
    expect(screen.getByText('-0.2 lb a week over 3 weeks, not toward your goal.')).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/ kg a week/);
  });

  test('a call kept before its numbers were: the longer sentence, no number made up', async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories({ reasons: [{ rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } }] }));
    await show();
    expect(screen.getByText(t('decision.rule.not_toward_goal'))).toBeOnTheScreen();
  });

  test("the call that closes the first week: when food and weight start, in the second reason's place", async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision({
        copyKey: 'decision.continue.first_week_on_track',
        action: { type: 'CONTINUE' } as Schemas['Decision']['action'],
        reasons: [
          { rule: 'first_week_on_track', source: { tag: 'EXPERIENCE' }, facts: { done: 2, planned: 3 } },
          { rule: 'energy_floor', source: { tag: 'PRODUCT' } },
        ],
        application: { state: 'NOT_NEEDED' },
        declinable: false,
        observationDays: 14,
      }),
    );
    await show();
    expect(screen.getByText('2 of 3 sessions happened. The plan stays.')).toBeOnTheScreen();
    expect(screen.getByText('Food and weight wait until day 14.')).toBeOnTheScreen();
    expect(screen.queryByText(t('decision.ruleShort.energy_floor'))).toBeNull();
  });

  test('a call without observationDays says nothing of waiting', async () => {
    mockAnswers['/v1/decisions/current'] = ok(calories());
    await show();
    expect(screen.queryByText(/Food and weight wait/)).toBeNull();
  });

  test("the safety call: its phase change shown, and no way to keep last week's plan", async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision({
        copyKey: 'decision.change_phase.low_energy_safety',
        action: { type: 'CHANGE_PHASE', to: 'BULK' } as Schemas['Decision']['action'],
        safety: true,
        declinable: false,
        reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' }, facts: { kcal: 250 } }],
        changes: [{ what: 'PHASE', before: { phase: 'CUT' }, after: { phase: 'BULK' } }],
      }),
    );
    await show();
    expect(screen.getByText('Phase')).toBeOnTheScreen();
    expect(screen.getByText('Cutting')).toBeOnTheScreen();
    expect(screen.getByText('Building')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();
    expect(screen.queryByText(/250/)).toBeNull(); // no reason said, so none of its numbers
    expect(screen.getByRole('button', { name: t('callScreen.gotIt') })).toBeOnTheScreen();
  });

  test('a past call shows the same changes, read only', async () => {
    mockParams = { id: 'd0' };
    mockAnswers['/v1/decisions/{id}'] = ok(calories({ id: 'd0' }));
    await show();
    expect(screen.getByText('1,850 kcal')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();
  });
});

describe('a past call (Progress › Calls)', () => {
  test('an applied one says it was applied, not that it is in this week\'s plan; the way back names where it came from', async () => {
    mockParams = { id: 'd0', from: 'progress' };
    mockAnswers['/v1/decisions/{id}'] = ok(decision({ id: 'd0' }));
    await show();
    expect(screen.getByText(t('callScreen.applied'))).toBeOnTheScreen();
    expect(screen.queryByText(t('callScreen.inPlan'))).toBeNull();
    expect(screen.getByRole('button', { name: t('callScreen.backProgress') })).toBeOnTheScreen();
  });

  test('the same screen, read only: where it stands, and nothing to tap but the way back', async () => {
    mockParams = { id: 'd0' };
    mockAnswers['/v1/decisions/{id}'] = ok(decision({ id: 'd0', application: { state: 'DECLINED' }, declinable: false }));
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}', { params: { path: { id: 'd0' } } });
    expect(screen.getByText(t('callScreen.notApplied'))).toBeOnTheScreen();
    for (const name of ['callScreen.gotIt', 'callScreen.keep', 'callScreen.use']) expect(screen.queryByRole('button', { name: t(name) })).toBeNull();
    expect(screen.getByRole('button', { name: t('callScreen.back') })).toBeOnTheScreen();
  });
});
