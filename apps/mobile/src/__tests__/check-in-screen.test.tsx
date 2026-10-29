/**
 * The Monday check-in (K-501, U9): only the questions the server asks, in its order, each with why it is asked; the
 * answers go once, under one clientId, and the engine makes the week's call. Nothing of it is kept on the phone: a
 * failed send leaves the answers on the screen only — CYCLE_STOPPED is never kept or logged anywhere (V4, ADR-020 L-1).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import CheckInScreen from '@/app/check-in';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const TRAINING: Schemas['Question'] = {
  kind: 'TRAINING',
  format: 'CHOICE',
  choices: ['IMPROVING', 'STABLE', 'DECLINING', 'NOT_TRAINED'],
  copyKey: 'checkIn.question.training',
  reasonCopyKey: 'checkIn.reason.training',
};
const CYCLE: Schemas['Question'] = {
  kind: 'CYCLE_STOPPED',
  format: 'CHOICE',
  choices: ['YES', 'NO'],
  copyKey: 'checkIn.question.cycle_stopped',
  reasonCopyKey: 'checkIn.reason.cycle_stopped',
};
const ENERGY: Schemas['Question'] = { kind: 'ENERGY', format: 'SCALE_1_10', copyKey: 'checkIn.question.training', reasonCopyKey: 'checkIn.reason.training' };
const CALL = { id: 'c1', madeOn: '2026-10-05', action: { type: 'CONTINUE' } };

let mockCheckIn: () => Promise<Answer> = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING, CYCLE] });
let mockSend: () => Promise<Answer> = async () => ok(CALL);
const mockGET = jest.fn(async (_path: string) => mockCheckIn());
const mockPOST = jest.fn(async (_path: string, _init: { body: Schemas['CheckInAnswers'] }) => mockSend());
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: (to: string) => mockPush(to), replace: (to: string) => mockReplace(to) } }));
// No queue and no key-value store on hand: the screen has nowhere to keep the answers, by design.
const mockServices = { api: { GET: mockGET, POST: mockPOST }, report: jest.fn() };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING, CYCLE] });
  mockSend = async () => ok(CALL);
});

async function show() {
  await render(
    <ThemeProvider>
      <CheckInScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const sendButton = () => screen.getByRole('button', { name: t('checkIn.screen.send') });
const sent = () => mockPOST.mock.calls.map(([, init]) => init.body);

test("the server's questions, in its order, each with why it is asked", async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/check-ins/current');
  const texts = [t('checkIn.question.training'), t('checkIn.reason.training'), t('checkIn.question.cycle_stopped'), t('checkIn.reason.cycle_stopped')];
  for (const text of texts) expect(screen.getByText(text)).toBeOnTheScreen();
  // In the server's order: the first question above the second on the screen.
  const tree = JSON.stringify(screen.toJSON());
  expect(tree.indexOf(t('checkIn.question.training'))).toBeLessThan(tree.indexOf(t('checkIn.question.cycle_stopped')));
  expect(screen.getByRole('button', { name: t('checkIn.choice.training.improving') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('checkIn.choice.cycle_stopped.yes') })).toBeOnTheScreen();
});

test('the call is asked for only once every question is answered; the answers go in the order asked, then on to the call', async () => {
  await show();
  expect(sendButton()).toBeDisabled();
  await press(t('checkIn.choice.cycle_stopped.no'));
  expect(sendButton()).toBeDisabled();
  await press(t('checkIn.choice.training.stable'));
  expect(sendButton()).toBeEnabled();
  await press(t('checkIn.screen.send'));
  expect(sent()).toEqual([
    {
      clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      weekOf: '2026-10-05',
      answers: [
        { kind: 'TRAINING', choice: 'STABLE' },
        { kind: 'CYCLE_STOPPED', choice: 'NO' },
      ],
    },
  ]);
  // K-978 (ADR-077 #2, flow C2): the answers make the call, and its screen takes the check-in's place.
  expect(mockReplace).toHaveBeenCalledWith('/call');
  expect(mockBack).not.toHaveBeenCalled();
});

test('a choice can be changed before sending: the last one goes', async () => {
  await show();
  await press(t('checkIn.choice.training.stable'));
  await press(t('checkIn.choice.training.declining'));
  await press(t('checkIn.choice.cycle_stopped.no'));
  await press(t('checkIn.screen.send'));
  expect(sent()[0].answers[0]).toEqual({ kind: 'TRAINING', choice: 'DECLINING' });
});

test('"Haven\'t trained" (K-1031): the fourth choice is the server\'s, a full touch target, and goes as the plain fact NOT_TRAINED', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING] });
  await show();
  const chip = screen.getByRole('button', { name: t('checkIn.choice.training.not_trained') });
  expect(chip).toHaveStyle({ minHeight: tokens.size.touch, minWidth: tokens.size.touch });
  expect(t('checkIn.choice.training.not_trained')).toBe("Haven't trained");
  await press(t('checkIn.choice.training.not_trained'));
  expect(chip).toBeSelected();
  await press(t('checkIn.screen.send'));
  // The phone sends what was picked; what it means for the call is the engine's (U1).
  expect(sent()).toEqual([{ clientId: expect.any(String), weekOf: '2026-10-05', answers: [{ kind: 'TRAINING', choice: 'NOT_TRAINED' }] }]);
});

test('a question the server reads only after some answers (onlyAfter): hidden, not required and not sent after the others', async () => {
  const RECOVERY: Schemas['Question'] = {
    kind: 'RECOVERY',
    format: 'CHOICE',
    choices: ['GOOD', 'POOR'],
    copyKey: 'checkIn.question.recovery',
    reasonCopyKey: 'checkIn.reason.recovery',
    onlyAfter: { kind: 'TRAINING', choices: ['IMPROVING', 'STABLE'] },
  };
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING, RECOVERY] });
  await show();
  // Not answered yet: both show, and the call waits for both.
  expect(screen.getByText(t('checkIn.question.recovery'))).toBeOnTheScreen();
  await press(t('checkIn.choice.training.not_trained'));
  expect(screen.queryByText(t('checkIn.question.recovery'))).toBeNull();
  expect(sendButton()).toBeEnabled();
  await press(t('checkIn.screen.send'));
  expect(sent()[0].answers).toEqual([{ kind: 'TRAINING', choice: 'NOT_TRAINED' }]);
});

test('onlyAfter: another training answer brings the question back, and an answer given before is dropped when it goes', async () => {
  const RECOVERY: Schemas['Question'] = {
    kind: 'RECOVERY',
    format: 'CHOICE',
    choices: ['GOOD', 'POOR'],
    copyKey: 'checkIn.question.recovery',
    reasonCopyKey: 'checkIn.reason.recovery',
    onlyAfter: { kind: 'TRAINING', choices: ['IMPROVING', 'STABLE'] },
  };
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING, RECOVERY] });
  await show();
  await press(t('checkIn.choice.training.stable'));
  expect(screen.getByText(t('checkIn.question.recovery'))).toBeOnTheScreen();
  expect(sendButton()).toBeDisabled();
  await press(t('checkIn.choice.recovery.good'));
  await press(t('checkIn.choice.training.declining'));
  expect(screen.queryByText(t('checkIn.question.recovery'))).toBeNull();
  expect(sendButton()).toBeEnabled();
  // With a choice that leaves it needed, it is back, and what was picked is sent with it.
  await press(t('checkIn.choice.training.improving'));
  expect(screen.getByText(t('checkIn.question.recovery'))).toBeOnTheScreen();
  await press(t('checkIn.screen.send'));
  expect(sent()[0].answers).toEqual([
    { kind: 'TRAINING', choice: 'IMPROVING' },
    { kind: 'RECOVERY', choice: 'GOOD' },
  ]);
});

test('nothing to ask: it says so, and the call is one tap away', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [] });
  await show();
  expect(screen.getByText(t('checkIn.screen.none'))).toBeOnTheScreen();
  await press(t('checkIn.screen.send'));
  expect(sent()).toEqual([{ clientId: expect.any(String), weekOf: '2026-10-05', answers: [] }]);
});

test("the week's call already made: it says where it is, and offers nothing to send", async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: true, questions: [] });
  await show();
  expect(screen.getByText(t('checkIn.screen.answered'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('checkIn.screen.send') })).toBeNull();
});

test('a send that does not arrive says so, keeps the answers on the screen only, and goes again under the same clientId', async () => {
  mockSend = async () => Promise.reject(new TypeError('Network request failed'));
  await show();
  await press(t('checkIn.choice.training.stable'));
  await press(t('checkIn.choice.cycle_stopped.yes'));
  await press(t('checkIn.screen.send'));
  expect(screen.getByText(t('checkIn.screen.sendFailed'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('checkIn.choice.cycle_stopped.yes') })).toBeSelected();
  expect(mockBack).not.toHaveBeenCalled();
  mockSend = async () => ok(CALL);
  await press(t('checkIn.screen.send'));
  expect(sent()[1].clientId).toBe(sent()[0].clientId);
  expect(mockReplace).toHaveBeenCalledWith('/call'); // K-978: on to the call
});

test('V4: the cycle answer is sent and nowhere else — not reported, not logged', async () => {
  const logs = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
  mockSend = async () => refused(500, 'INTERNAL');
  await show();
  await press(t('checkIn.choice.training.stable'));
  await press(t('checkIn.choice.cycle_stopped.yes'));
  await press(t('checkIn.screen.send'));
  const said = JSON.stringify([...logs.flatMap((spy) => spy.mock.calls), ...mockServices.report.mock.calls]);
  expect(said).not.toMatch(/YES|CYCLE/);
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'ServerError' });
  logs.forEach((spy) => spy.mockRestore());
});

test('the week moved under it (409): the check-in is read again, and its answers start over', async () => {
  let reads = 0;
  mockCheckIn = async () => (++reads === 1 ? ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING] }) : ok({ weekOf: '2026-10-12', answered: false, questions: [TRAINING] }));
  mockSend = async () => refused(409, 'CONFLICT');
  await show();
  await press(t('checkIn.choice.training.stable'));
  await press(t('checkIn.screen.send'));
  expect(mockGET).toHaveBeenCalledTimes(2);
  expect(screen.getByText(t('checkIn.screen.moved'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('checkIn.choice.training.stable') })).not.toBeSelected();
  expect(sendButton()).toBeDisabled();
});

test('every answer chip is a full touch target (44 pt, user test 10 Oct: they were about 35), choices and the scale alike', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING, ENERGY] });
  await show();
  const chips = [
    screen.getByRole('button', { name: t('checkIn.choice.training.improving') }),
    ...Array.from({ length: 10 }, (_, i) => screen.getByRole('button', { name: t('checkIn.screen.scaleSpoken', { n: i + 1 }) })),
  ];
  for (const chip of chips) expect(chip).toHaveStyle({ minHeight: tokens.size.touch, minWidth: tokens.size.touch });
});

test('a scale question: ten steps, the number sent', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [ENERGY] });
  await show();
  for (let n = 1; n <= 10; n++) expect(screen.getByRole('button', { name: t('checkIn.screen.scaleSpoken', { n }) })).toBeOnTheScreen();
  await press(t('checkIn.screen.scaleSpoken', { n: 7 }));
  await press(t('checkIn.screen.send'));
  expect(sent()[0].answers).toEqual([{ kind: 'ENERGY', scale: 7 }]);
});

test('the check-in that cannot be read says so, and can be read again', async () => {
  mockCheckIn = async () => Promise.reject(new TypeError('Network request failed'));
  await show();
  expect(screen.getByText(t('checkIn.screen.failed'))).toBeOnTheScreen();
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [TRAINING] });
  await press(t('checkIn.screen.retry'));
  expect(screen.getByText(t('checkIn.question.training'))).toBeOnTheScreen();
});

test('without the health data consent: one line and the way to Settings', async () => {
  mockCheckIn = async () => refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
  await press(t('today.consent.open'));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

test('two taps on send while it is on its way send once', async () => {
  let answer: (a: Answer) => void = () => {};
  mockSend = () => new Promise((resolve) => (answer = resolve));
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [] });
  await show();
  const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => {
      void fireEvent.press(sendButton());
      void fireEvent.press(sendButton());
    });
  } finally {
    overlapNote.mockRestore();
  }
  expect(mockPOST).toHaveBeenCalledTimes(1);
  await act(async () => answer(ok(CALL)));
});

test('the way back is the system header\'s, on every state of the screen: the screen draws none', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: true, questions: [] });
  await show();
  expect(screen.queryByRole('button', { name: /^(‹ )?(Back|This week)$/ })).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
});

test('the screen left while the answers are on their way: nothing is closed when they arrive', async () => {
  let answer: (a: Answer) => void = () => {};
  mockSend = () => new Promise((resolve) => (answer = resolve));
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [] });
  await show();
  await fireEvent.press(sendButton());
  await screen.unmount();
  await act(async () => answer(ok(CALL)));
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled(); // K-978: nor is the call opened over whatever is there now
});

test('the consent withdrawn meanwhile (403 on the send): said as the consent, not as a fault', async () => {
  mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [] });
  mockSend = async () => refused(403, 'CONSENT_REQUIRED');
  await show();
  await press(t('checkIn.screen.send'));
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
  expect(screen.queryByText(t('checkIn.screen.serverError'))).toBeNull();
});

test('the week moved and its call is already made: the screen says only that the call is in', async () => {
  let reads = 0;
  mockCheckIn = async () => (++reads === 1 ? ok({ weekOf: '2026-10-05', answered: false, questions: [] }) : ok({ weekOf: '2026-10-05', answered: true, questions: [] }));
  mockSend = async () => refused(409, 'CONFLICT');
  await show();
  await press(t('checkIn.screen.send'));
  expect(screen.getByText(t('checkIn.screen.answered'))).toBeOnTheScreen();
  expect(screen.queryByText(t('checkIn.screen.moved'))).toBeNull();
});

describe('the first week (K-978, ADR-077 #2)', () => {
  const WEEK1: Schemas['Question'] = {
    kind: 'WEEK1_FEEL',
    format: 'CHOICE',
    choices: ['TOO_MUCH', 'ABOUT_RIGHT', 'COULD_DO_MORE'],
    copyKey: 'checkIn.question.week1_feel',
    reasonCopyKey: 'checkIn.reason.week1_feel',
  };

  test('"How did week 1 feel?" with its three answers and its reason; the answer goes as the week-1 feel', async () => {
    mockCheckIn = async () => ok({ weekOf: '2026-10-05', answered: false, questions: [WEEK1] });
    await show();
    expect(screen.getByText('How did week 1 feel?')).toBeOnTheScreen();
    expect(screen.getByText(t('checkIn.reason.week1_feel'))).toBeOnTheScreen();
    for (const choice of ['too_much', 'about_right', 'could_do_more']) {
      expect(screen.getByRole('button', { name: t(`checkIn.choice.week1_feel.${choice}`) })).toBeOnTheScreen();
    }
    await press(t('checkIn.choice.week1_feel.could_do_more'));
    await press(t('checkIn.screen.send'));
    expect(sent()).toEqual([expect.objectContaining({ answers: [{ kind: 'WEEK1_FEEL', choice: 'COULD_DO_MORE' }] })]);
  });

  test('no paragraph beside the questions: each says why it is asked, under itself', async () => {
    await show();
    expect(screen.queryByText(/Only what your logs/)).toBeNull();
  });
});
