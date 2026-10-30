/**
 * Saying life got in the way (K-518, ADR-038; new face K-981, ADR-077 #6 and Ek 6, prototype #life): one of five states as
 * a tile; until the user is back, or for a few days. Declared, never asked (U9): the week pauses and the reminders go quiet
 * — nothing is held against anyone (U7). Sick and In pain are health data and need the health data consent: without it the
 * consent is asked on this screen and the choice is kept; Traveling, Busy week and New gym are not, and need none.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import StateScreen from '@/app/state';
import { t } from '@/copy';
import { stateParams } from '@/state/params';
import { ThemeProvider } from '@/theme/theme';

const mockDeclare = jest.fn(async (_kind: string, _days?: number) => ({ kind: 'SICK', since: '2026-10-07' }));
const mockBack = jest.fn();
const mockReport = jest.fn();
let mockConsented = true;
let mockGrantFails = false;
const mockGranted = jest.fn(async (_kind: string) => mockConsented);
const mockRemember = jest.fn(async (_kind: string, _status: string) => {});
const mockPut = jest.fn(async (_path: string, _init: unknown) =>
  mockGrantFails
    ? { error: { code: 'X', message: 'x' }, response: new Response(null, { status: 500 }) }
    : { data: { kind: 'HEALTH_DATA', status: 'GRANTED' }, response: new Response(null, { status: 200 }) },
);
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => ({
    state: { declare: mockDeclare },
    consents: { granted: mockGranted, remember: mockRemember },
    api: { PUT: mockPut },
    report: mockReport,
  }),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 7, 9, 0), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'queueMicrotask'] }));
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockConsented = true;
  mockGrantFails = false;
  mockDeclare.mockImplementation(async () => ({ kind: 'SICK', since: '2026-10-07' }));
});

async function show() {
  await render(
    <ThemeProvider>
      <StateScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const choose = async (kind: string) => {
  await fireEvent.press(screen.getByRole('radio', { name: t(`state.tile.${kind}`) }));
  await act(async () => {});
};
const pause = () => screen.getByRole('button', { name: t('state.screen.pause') });

test('five states as tiles; nothing is pre-chosen; nothing counts against the user and the safety checks still run', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('state.screen.title') })).toBeOnTheScreen();
  expect(screen.getByText('Nothing counts against you. Safety checks still run.')).toBeOnTheScreen();
  for (const kind of ['traveling', 'sick', 'pain', 'busy', 'new_gym']) {
    expect(screen.getByRole('radio', { name: t(`state.tile.${kind}`) }).props.accessibilityState).toMatchObject({ checked: false });
  }
  expect(pause()).toBeDisabled();
});

test('a chosen tile is the one checked', async () => {
  await show();
  await choose('busy');
  expect(screen.getByRole('radio', { name: t('state.tile.busy') }).props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByRole('radio', { name: t('state.tile.sick') }).props.accessibilityState).toMatchObject({ checked: false });
});

test('until the user is back by default: no last day is sent; then back to Today', async () => {
  await show();
  await choose('sick');
  await press(t('state.screen.pause'));
  expect(mockDeclare).toHaveBeenCalledWith('SICK', undefined);
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('for a few days: the count of days is sent, no date (the server counts today in)', async () => {
  await show();
  await choose('traveling');
  const days = stateParams.untilChoicesDays[0];
  await press(t('state.screen.forDays', { days }));
  await press(t('state.screen.pause'));
  expect(mockDeclare).toHaveBeenCalledWith('TRAVELING', days);
});

test('the lengths offered are 3 and 7 days, besides until the user is back (ADR-077 #6)', async () => {
  await show();
  expect(stateParams.untilChoicesDays).toEqual([3, 7]);
  expect(screen.getByRole('button', { name: t('state.screen.forDays', { days: 3 }) })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('state.screen.forDays', { days: 7 }) })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('state.screen.forDays', { days: 14 }) })).toBeNull();
});

test('not recorded: it says so, by connection or not, and stays', async () => {
  mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
  await show();
  await choose('busy');
  await press(t('state.screen.pause'));
  expect(screen.getByText(t('state.screen.noConnection'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith({ name: 'NoConnection' });
  expect(mockBack).not.toHaveBeenCalled();
  mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'StateRefused' }));
  await press(t('state.screen.pause'));
  expect(screen.getByText(t('state.screen.refused'))).toBeOnTheScreen();
});

test('the way back to Today is the system header\'s (none drawn here); nothing is declared by leaving', async () => {
  await show();
  expect(screen.queryByRole('button', { name: /^(‹ )?(Back|This week)$/ })).toBeNull();
  expect(mockDeclare).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('two taps while it is on its way declare once', async () => {
  let answer: () => void = () => {};
  mockDeclare.mockImplementation(() => new Promise((resolve) => (answer = () => resolve({ kind: 'PAIN', since: '2026-10-07' }))));
  await show();
  await choose('pain');
  const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => {
      void fireEvent.press(pause());
      void fireEvent.press(pause());
    });
  } finally {
    overlapNote.mockRestore();
  }
  expect(mockDeclare).toHaveBeenCalledTimes(1);
  await act(async () => answer());
});

describe('the health data consent (ADR-077 Ek 6, K-1021): only Sick and In pain are health data', () => {
  const consentTitle = () => screen.queryByText(t('consent.health_data.title'));

  test.each(['traveling', 'busy', 'new_gym'])('without the consent, %s is declared at once: no consent in the way', async (kind) => {
    mockConsented = false;
    await show();
    await choose(kind);
    await press(t('state.screen.pause'));
    expect(mockDeclare).toHaveBeenCalledWith(kind.toUpperCase(), undefined);
    expect(consentTitle()).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test.each(['sick', 'pain'])('without the consent, %s leads to the consent, not to an error; nothing is declared yet', async (kind) => {
    mockConsented = false;
    await show();
    await choose(kind);
    await press(t('state.screen.pause'));
    expect(consentTitle()).toBeOnTheScreen();
    expect(screen.getByText(t('state.consent.why'))).toBeOnTheScreen();
    expect(screen.queryByText(t('consent.health_data.points.collected'))).toBeNull();
    await press(t('consent.step.fullText'));
    expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
    expect(screen.queryByText(t('state.screen.refused'))).toBeNull();
    expect(mockDeclare).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('the first tap on Pause my week asks for the consent: nothing declared, no second tap needed; a consent the phone cannot read is not given', async () => {
    mockGranted.mockRejectedValueOnce(new Error('keychain'));
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    expect(consentTitle()).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('state.consent.allow') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('state.consent.notNow') })).toBeOnTheScreen();
    expect(mockDeclare).not.toHaveBeenCalled();
  });

  test('allowing records the consent, then declares what was chosen with its length, and leaves', async () => {
    mockConsented = false;
    await show();
    await choose('pain');
    await press(t('state.screen.forDays', { days: 7 }));
    await press(t('state.screen.pause'));
    await press(t('state.consent.allow'));
    expect(mockPut).toHaveBeenCalledWith('/v1/consents/{kind}', expect.objectContaining({ params: { path: { kind: 'HEALTH_DATA' } } }));
    expect(mockRemember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
    expect(mockDeclare).toHaveBeenCalledWith('PAIN', 7);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('with the consent given, Sick is declared at once', async () => {
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    expect(mockDeclare).toHaveBeenCalledWith('SICK', undefined);
    expect(consentTitle()).toBeNull();
  });

  test('the server says the consent is needed though the phone thought it had it: the consent step, then it goes through', async () => {
    mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConsentRequired' }));
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    expect(consentTitle()).toBeOnTheScreen();
    expect(screen.queryByText(t('state.screen.refused'))).toBeNull();
    await press(t('state.consent.allow'));
    expect(mockDeclare).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the consent is given and the server still wants it (a version that does not match): it says so and stops, no loop back to the consent', async () => {
    mockConsented = false;
    mockDeclare.mockRejectedValue(Object.assign(new Error('x'), { name: 'ConsentRequired' }));
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    await press(t('state.consent.allow'));
    expect(consentTitle()).toBeNull();
    expect(screen.getByText(t('state.screen.refused'))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: t('state.tile.sick') }).props.accessibilityState).toMatchObject({ checked: true });
    expect(mockDeclare).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith({ name: 'ConsentRequired' });
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('Not now: back to the five states with the choice kept; the ones that need no consent still go through', async () => {
    mockConsented = false;
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    await press(t('state.consent.notNow'));
    expect(consentTitle()).toBeNull();
    expect(screen.getByRole('radio', { name: t('state.tile.sick') }).props.accessibilityState).toMatchObject({ checked: true });
    await choose('traveling');
    await press(t('state.screen.pause'));
    expect(mockDeclare).toHaveBeenCalledWith('TRAVELING', undefined);
  });

  test('the consent not recorded: it says so and stays on the consent; nothing is declared', async () => {
    mockConsented = false;
    mockGrantFails = true;
    await show();
    await choose('sick');
    await press(t('state.screen.pause'));
    await press(t('state.consent.allow'));
    expect(screen.getByText(t('state.consent.failed'))).toBeOnTheScreen();
    expect(consentTitle()).toBeOnTheScreen();
    expect(mockDeclare).not.toHaveBeenCalled();
    expect(mockRemember).not.toHaveBeenCalled();
  });

  test('the consent recorded but the state not: back on the five states with the choice kept, and it says so', async () => {
    mockConsented = false;
    mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await show();
    await choose('pain');
    await press(t('state.screen.pause'));
    await press(t('state.consent.allow'));
    expect(consentTitle()).toBeNull();
    expect(screen.getByText(t('state.screen.noConnection'))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: t('state.tile.pain') }).props.accessibilityState).toMatchObject({ checked: true });
    expect(mockBack).not.toHaveBeenCalled();
  });
});
