/**
 * The call that closes the first week, on the call screen (K-978, ADR-077 #4 and Ek 1, prototype #week1 and #w1change):
 * "Sounds right" takes the days the server suggested, "Change it" lets the user pick others, "Done" once they have; the
 * save is the program's days edited by their ids. One more day: for a program of two days the server adds the suggested
 * weekday (POST /v1/program/days, K-1012), otherwise it is picked in the training days. Nothing here works out a day: the suggestion and the training weekdays are the server's.
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

const exercise = (id: string): Schemas['PlannedExercise'] => ({ id, exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 2 });
const program = (): Schemas['Program'] => ({
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'full_body_a', weekday: 'MONDAY', exercises: [exercise('a1')] },
    { id: 'b', nameKey: 'full_body_b', weekday: 'WEDNESDAY', exercises: [exercise('b1')] },
    { id: 'c', nameKey: 'full_body_c', weekday: 'FRIDAY', exercises: [exercise('c1')] },
  ],
});
const moveCall = (extra: Partial<Schemas['Decision']> = {}, suggested: string[] = ['THURSDAY']): Schemas['Decision'] =>
  ({
    id: 'd1',
    madeOn: '2026-10-12',
    action: { type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY'], suggested },
    reasons: [{ rule: 'first_week_move_missed', source: { tag: 'EXPERIENCE' }, facts: { done: 1, planned: 3 } }],
    confidence: 'MEDIUM',
    nextReview: '2026-10-19',
    copyKey: 'decision.move_missed_sessions.first_week_move_missed',
    application: { state: 'NOT_NEEDED' },
    declinable: false,
    changes: [],
    observationDays: 14,
    ...extra,
  }) as Schemas['Decision'];
const addCall = (suggested: string[] = ['SATURDAY']): Schemas['Decision'] =>
  moveCall({
    action: { type: 'ADD_TRAINING_DAY', toDays: 4, idealDays: 4, suggested } as Schemas['Decision']['action'],
    copyKey: 'decision.add_training_day.first_week_add_day',
    reasons: [{ rule: 'first_week_add_day', source: { tag: 'EXPERIENCE' }, facts: { done: 3, planned: 3 } }],
  });

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockPatch: Answer | 'offline' = ok(program());
const mockPATCH = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPatch === 'offline') throw new TypeError('Network request failed');
  return mockPatch;
});
let mockPost: Answer | 'offline' = ok(program());
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPost === 'offline') throw new TypeError('Network request failed');
  return mockPost;
});
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (to: string) => mockPush(to) },
  useLocalSearchParams: () => mockParams,
}));
let mockParams: { id?: string } = {};
const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const mockServices = { api: { GET: mockGET, POST: mockPOST, PATCH: mockPATCH }, report: jest.fn() };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPatch = ok(program());
  mockPost = ok(program());
  mockAnswers = { '/v1/decisions/current': ok(moveCall()), '/v1/program': ok(program()) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CallScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const w = (key: string) => t(`callScreen.week1.${key}`);
const patched = () => mockPATCH.mock.calls.map(([, init]) => (init as { body: Schemas['ProgramEdit'] }).body);
const weekdaysSent = () => patched()[0].days.map((d) => d.weekday);

describe('missed sessions: the suggestion comes filled', () => {
  test('the session and the day it goes to, from the server; "Sounds right" and "Change it", not "Got it"', async () => {
    await show();
    expect(screen.getByText(w('session').replace('{day}', 'Wed'))).toBeOnTheScreen();
    expect(screen.getByText('Thu')).toBeOnTheScreen();
    expect(screen.getByLabelText(`${t('callScreen.week1.session', { day: 'Wed' })}: was Wed, now Thu`)).toBeOnTheScreen();
    expect(screen.getByText('1 of 3 sessions happened. A day that fits helps.')).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.observation', { days: 14 }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: w('soundsRight') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: w('changeIt') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('callScreen.gotIt') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();
  });

  test('"Sounds right": the suggested day saved on the program by its ids, then back to the week', async () => {
    await show();
    await press(w('soundsRight'));
    expect(mockPATCH).toHaveBeenCalledTimes(1);
    expect(mockPATCH.mock.calls[0][0]).toBe('/v1/program');
    expect(weekdaysSent()).toEqual(['MONDAY', 'THURSDAY', 'FRIDAY']);
    expect(patched()[0].days[1]).toMatchObject({ id: 'b', exercises: [{ id: 'b1', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }] });
    expect(mockBack).toHaveBeenCalled();
    expect(said).toHaveBeenCalledWith(w('saved'));
  });

  test('two taps at once send once', async () => {
    let answer: (value: Answer) => void = () => {};
    mockPATCH.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
    await show();
    const button = screen.getByRole('button', { name: w('soundsRight') });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => answer(ok(program())));
    expect(mockPATCH).toHaveBeenCalledTimes(1);
  });
});

describe('"Change it" (prototype #w1change)', () => {
  const free = ['TUESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY'];

  test("the suggestion said, the free days to pick from (the days the program trains on are not offered), the plan as it was", async () => {
    await show();
    await press(w('changeIt'));
    expect(screen.getByText(w('changeTitle'))).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.week1.changeHint', { suggestion: t('callScreen.week1.suggestion', { to: 'Thursday', from: 'Wednesday' }) }))).toBeOnTheScreen();
    expect(screen.getByText(t('callScreen.week1.moveHead', { day: 'Wednesday' }))).toBeOnTheScreen();
    for (const day of free) expect(screen.getByRole('button', { name: t(`programEditor.weekdayName.${day}`) })).toBeOnTheScreen();
    for (const day of ['MONDAY', 'WEDNESDAY', 'FRIDAY']) expect(screen.queryByRole('button', { name: t(`programEditor.weekdayName.${day}`) })).toBeNull();
    expect(screen.getByRole('button', { name: w('keepSuggestion') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('callScreen.keep') })).toBeOnTheScreen();
  });

  test('a day picked: the call shows it, its button reads "Done", and that day is the one saved', async () => {
    await show();
    await press(w('changeIt'));
    await press(t('programEditor.weekdayName.SATURDAY'));
    await press(w('done'));
    expect(screen.getByText('Sat')).toBeOnTheScreen();
    expect(screen.queryByText('Thu')).toBeNull();
    expect(screen.queryByRole('button', { name: w('soundsRight') })).toBeNull();
    await press(w('done'));
    expect(weekdaysSent()).toEqual(['MONDAY', 'SATURDAY', 'FRIDAY']);
    expect(mockBack).toHaveBeenCalled();
  });

  test('"Keep the suggestion" after a pick: the suggestion again, "Sounds right" again', async () => {
    await show();
    await press(w('changeIt'));
    await press(t('programEditor.weekdayName.SATURDAY'));
    await press(w('keepSuggestion'));
    expect(screen.getByText('Thu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: w('soundsRight') })).toBeOnTheScreen();
  });

  test("\"Keep last week's plan\": nothing saved, back to the week", async () => {
    await show();
    await press(w('changeIt'));
    await press(t('callScreen.keep'));
    expect(mockPATCH).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  test('two missed days: each its own day, and no day twice', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      moveCall({ action: { type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY', 'SATURDAY'] } as Schemas['Decision']['action'] }),
    );
    await show();
    await press(w('changeIt'));
    expect(screen.getByText(t('callScreen.week1.moveHead', { day: 'Friday' }))).toBeOnTheScreen();
    // Thursday is Wednesday's: Friday's session is not offered it.
    expect(screen.getAllByRole('button', { name: t('programEditor.weekdayName.THURSDAY') })).toHaveLength(1);
  });
});

describe('when it does not save', () => {
  test('the program changed (409): said, nothing closed', async () => {
    mockPatch = refused(409, 'CONFLICT');
    await show();
    await press(w('soundsRight'));
    expect(screen.getByText(w('stale'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test("the 409 does not say why: today's workout may have started, not only a changed plan", async () => {
    expect(w('stale')).not.toMatch(/changed since|plan changed/i);
    mockPatch = refused(409, 'CONFLICT');
    await show();
    await press(w('soundsRight'));
    expect(screen.getByText(w('stale'))).toBeOnTheScreen();
  });

  test('the edit is outside what a program is (400): its own line, not "try again in a moment"', async () => {
    mockPatch = refused(400, 'VALIDATION_FAILED');
    await show();
    await press(w('soundsRight'));
    expect(screen.getByText(w('refused'))).toBeOnTheScreen();
    expect(screen.queryByText(w('failed'))).toBeNull();
  });

  test('after the 409 the program is read again; if the missed day is no training day now, the note stays with "Got it"', async () => {
    mockPatch = refused(409, 'CONFLICT');
    await show();
    const moved = program();
    moved.days[1].weekday = 'THURSDAY';
    mockAnswers['/v1/program'] = ok(moved);
    await press(w('soundsRight'));
    expect(screen.getByText(w('stale'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: w('soundsRight') })).toBeNull();
    expect(screen.getByRole('button', { name: t('callScreen.gotIt') })).toBeOnTheScreen();
  });

  test('no connection: said, and the button still there to try again', async () => {
    mockPatch = 'offline';
    await show();
    await press(w('soundsRight'));
    expect(screen.getByText(w('offline'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: w('soundsRight') })).toBeEnabled();
    expect(said).toHaveBeenCalledWith(w('offline'));
  });

  test('any other refusal: ours, worth another try', async () => {
    mockPatch = refused(500, 'INTERNAL');
    await show();
    await press(w('soundsRight'));
    expect(screen.getByText(w('failed'))).toBeOnTheScreen();
  });

  test('the program could not be read when asked to save: it is read again, and if still not, said', async () => {
    mockAnswers['/v1/program'] = 'offline';
    await show();
    await press(w('soundsRight'));
    expect(mockPATCH).not.toHaveBeenCalled();
    expect(screen.getByText(w('offline'))).toBeOnTheScreen();
    mockAnswers['/v1/program'] = ok(program());
    await press(w('soundsRight'));
    expect(mockPATCH).toHaveBeenCalledTimes(1);
  });
});

describe('edge cases', () => {
  test('no free day for a missed one (the server suggested fewer): "Pick a day", and "Sounds right" waits for it', async () => {
    mockAnswers['/v1/decisions/current'] = ok(moveCall({}, []));
    await show();
    expect(screen.getByText(w('noDay'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: w('soundsRight') })).toBeDisabled();
  });

  test('the days were moved already (the missed day is no training day any more): nothing left to pick, only "Got it"', async () => {
    const moved = program();
    moved.days[1].weekday = 'THURSDAY';
    mockAnswers['/v1/program'] = ok(moved);
    await show();
    expect(screen.queryByRole('button', { name: w('soundsRight') })).toBeNull();
    expect(screen.queryByText(w('noDay'))).toBeNull();
    expect(screen.getByRole('button', { name: t('callScreen.gotIt') })).toBeOnTheScreen();
  });

  test('one of two missed days moved elsewhere already: only the other is offered and saved, "Sounds right" is not dead', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      moveCall({ action: { type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY', 'SATURDAY'] } as Schemas['Decision']['action'] }),
    );
    const moved = program();
    moved.days[1].weekday = 'THURSDAY'; // Wednesday's session went to Thursday meanwhile
    mockAnswers['/v1/program'] = ok(moved);
    await show();
    expect(screen.queryByText(w('session').replace('{day}', 'Wed'))).toBeNull();
    expect(screen.getByText(w('session').replace('{day}', 'Fri'))).toBeOnTheScreen();
    expect(screen.getByText('Sat')).toBeOnTheScreen();
    await press(w('soundsRight'));
    expect(weekdaysSent()).toEqual(['MONDAY', 'THURSDAY', 'SATURDAY']);
    expect(mockBack).toHaveBeenCalled();
  });

  test('two missed days, a pick for the second; the first moved elsewhere after a 409: the pick stays with its own day', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      moveCall({ action: { type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY', 'SATURDAY'] } as Schemas['Decision']['action'] }),
    );
    mockPatch = refused(409, 'CONFLICT');
    await show();
    await press(w('changeIt'));
    // Friday's group is the second one.
    await fireEvent.press(screen.getAllByRole('button', { name: t('programEditor.weekdayName.SUNDAY') })[1]);
    await press(w('done'));
    const moved = program();
    moved.days[1].weekday = 'THURSDAY'; // Wednesday's session went to Thursday meanwhile
    mockAnswers['/v1/program'] = ok(moved);
    await press(w('done'));
    expect(screen.getByText(w('stale'))).toBeOnTheScreen();
    expect(screen.getByLabelText(`${w('session').replace('{day}', 'Fri')}: was Fri, now Sun`)).toBeOnTheScreen();
    expect(screen.queryByText('Sat')).toBeNull();
  });

  test('two missed days, a pick for the first; it moved elsewhere after a 409: the second keeps the server\'s suggestion, not that pick', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      moveCall({ action: { type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY', 'SATURDAY'] } as Schemas['Decision']['action'] }),
    );
    mockPatch = refused(409, 'CONFLICT');
    await show();
    await press(w('changeIt'));
    await fireEvent.press(screen.getAllByRole('button', { name: t('programEditor.weekdayName.TUESDAY') })[0]);
    await press(w('done'));
    const moved = program();
    moved.days[1].weekday = 'THURSDAY';
    mockAnswers['/v1/program'] = ok(moved);
    await press(w('done'));
    expect(screen.getByText(w('stale'))).toBeOnTheScreen();
    expect(screen.getByLabelText(`${w('session').replace('{day}', 'Fri')}: was Fri, now Sat`)).toBeOnTheScreen();
    expect(screen.queryByText('Tue')).toBeNull();
    expect(screen.getByRole('button', { name: w('soundsRight') })).toBeOnTheScreen();
  });

  test('a past call of this kind, read only: its days are not offered again', async () => {
    mockParams = { id: 'd0' };
    mockAnswers['/v1/decisions/{id}'] = ok(moveCall({ id: 'd0' }));
    await show();
    expect(screen.queryByRole('button', { name: w('soundsRight') })).toBeNull();
    expect(screen.queryByRole('button', { name: w('changeIt') })).toBeNull();
    expect(mockGET).not.toHaveBeenCalledWith('/v1/program');
  });
});

const twoDays = (): Schemas['Program'] => {
  const two = program();
  two.days = two.days.slice(0, 2);
  return two;
};
const threeDays = (): Schemas['Program'] => ({ ...twoDays(), days: [...twoDays().days, { id: 'c', nameKey: 'full_body_c', weekday: 'SATURDAY', exercises: [exercise('c1')] }] });

describe('one more day: the day saved by the server when the program has two (K-1012)', () => {
  beforeEach(() => {
    mockAnswers['/v1/decisions/current'] = ok(addCall());
    mockAnswers['/v1/program'] = ok(twoDays());
  });

  test('two days: the suggested weekday goes to POST /v1/program/days, then "saved" and back to the week; the program editor is not opened', async () => {
    mockPost = ok(threeDays());
    await show();
    await press(w('pickDay'));
    expect(mockPOST).toHaveBeenCalledTimes(1);
    expect(mockPOST).toHaveBeenCalledWith('/v1/program/days', { body: { weekday: 'SATURDAY' } });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockPATCH).not.toHaveBeenCalled();
    expect(said).toHaveBeenCalledWith(w('saved'));
    expect(mockBack).toHaveBeenCalled();
  });

  test('two taps at once send once', async () => {
    let answer: (value: Answer) => void = () => {};
    mockPOST.mockImplementationOnce(() => new Promise<Answer>((resolve) => (answer = resolve)));
    await show();
    const button = screen.getByRole('button', { name: w('pickDay') });
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => answer(ok(threeDays())));
    expect(mockPOST).toHaveBeenCalledTimes(1);
  });

  test('three days (not two): the program editor, as before; nothing sent to the server for it', async () => {
    mockAnswers['/v1/program'] = ok(threeDays());
    await show();
    await press(w('pickDay'));
    expect(mockPOST).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/edit-program?part=days');
  });

  test('no day suggested: the program editor', async () => {
    mockAnswers['/v1/decisions/current'] = ok(addCall([]));
    await show();
    await press(w('pickDay'));
    expect(mockPOST).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/edit-program?part=days');
  });

  test('the server says no (409: a user\'s own program, a taken day, the days changed): the program editor, no note', async () => {
    mockPost = refused(409, 'CONFLICT');
    await show();
    await press(w('pickDay'));
    expect(mockPOST).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/edit-program?part=days');
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.queryByText(w('stale'))).toBeNull();
  });

  test('the day is outside what a program is (400): its own line, nothing opened, another try possible', async () => {
    mockPost = refused(400, 'VALIDATION_FAILED');
    await show();
    await press(w('pickDay'));
    expect(screen.getByText(w('refused'))).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: w('pickDay') })).toBeEnabled();
  });

  test('no connection: said, and the button still there', async () => {
    mockPost = 'offline';
    await show();
    await press(w('pickDay'));
    expect(screen.getByText(w('offline'))).toBeOnTheScreen();
    expect(said).toHaveBeenCalledWith(w('offline'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: w('pickDay') })).toBeEnabled();
  });

  test('any other refusal: ours, worth another try', async () => {
    mockPost = refused(500, 'INTERNAL');
    await show();
    await press(w('pickDay'));
    expect(screen.getByText(w('failed'))).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('one more day', () => {
  test('the count and the day suggested; the day is picked in the training days', async () => {
    mockAnswers['/v1/decisions/current'] = ok(addCall());
    await show();
    expect(screen.getByText(w('daysLabel'))).toBeOnTheScreen();
    expect(screen.getByText('4')).toBeOnTheScreen();
    expect(screen.getByText(w('suggestedDay'))).toBeOnTheScreen();
    expect(screen.getByText('Sat')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: w('soundsRight') })).toBeNull();
    await press(w('pickDay'));
    expect(mockPush).toHaveBeenCalledWith('/edit-program?part=days');
    expect(mockPATCH).not.toHaveBeenCalled();
  });

  test('no free day to suggest: the count only', async () => {
    mockAnswers['/v1/decisions/current'] = ok(addCall([]));
    await show();
    expect(screen.queryByText(w('suggestedDay'))).toBeNull();
    expect(screen.getByRole('button', { name: w('pickDay') })).toBeOnTheScreen();
  });

  test('"Got it" is still there', async () => {
    mockAnswers['/v1/decisions/current'] = ok(addCall());
    await show();
    await press(t('callScreen.gotIt'));
    expect(mockBack).toHaveBeenCalled();
  });
});
