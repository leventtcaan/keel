/**
 * Evre 7 final pass 6, the plan and preparing screens: only the call is a dark card (the first workout is a normal surface
 * card), a chip with no value is not drawn ("0 days", "Goal: We pick", an empty third chip), "1 day" is singular, and the
 * Monday switch answers when iOS will not allow notifications. The screens are rendered on their own with a program that
 * has days on no weekday (typed or brought in without one).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { components } from '@/api/schema';
import PlanScreen from '@/app/onboarding/plan';
import PreparingScreen from '@/app/onboarding/preparing';
import { t } from '@/copy';
import type { Progress } from '@/onboarding/prepare';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { name: string }) => createElement('SymbolView', { ...props, testID: `symbol-${props.name}` }) };
});
jest.mock('expo-router', () => ({ ...jest.requireActual<object>('expo-router'), Redirect: () => null, router: { replace: jest.fn() } }));
jest.mock('expo-router/stack', () => ({ Stack: { Screen: () => null } }));

const PROFILE = {
  goal: 'DECIDE_FOR_ME',
  schedule: { trainingDays: [], checkInDay: 'MONDAY', timeZone: 'UTC' },
} as unknown as Schemas['Profile'];
const typed = (days: { name: string; weekday?: Schemas['Weekday'] }[]): Schemas['Program'] =>
  ({
    id: 'p1',
    source: 'OWN',
    days: days.map((day, i) => ({
      id: `d${i}`,
      name: day.name,
      ...(day.weekday === undefined ? {} : { weekday: day.weekday }),
      exercises: [{ exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 }],
    })),
  }) as unknown as Schemas['Program'];

let mockProgress: Progress = {};
const mockSettings = { enabled: false, cue: '' };
const mockPermission = jest.fn(async () => ({ granted: false, canAskAgain: false }));
const mockReminders = {
  subscribe: () => () => {},
  current: () => mockSettings,
  turnOn: jest.fn(async (_options?: unknown) => mockPermission()),
  turnOff: jest.fn(async () => {}),
  keepFirstCall: jest.fn(),
};
const mockServices = {
  api: { PUT: jest.fn(async () => ({ response: new Response(null, { status: 204 }) })), GET: jest.fn(async () => ({ error: {}, response: new Response(null, { status: 404 }) })) },
  profile: { finish: jest.fn(async () => {}) },
  report: jest.fn(),
  planPreviews: { keep: jest.fn() },
  reminders: mockReminders,
  signOut: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
jest.mock('@/onboarding/OnboardingContext', () => ({
  useDraft: () => ({ draft: { trainingDays: [], healthConsent: 'declined' }, progress: mockProgress, setProgress: jest.fn(), update: jest.fn(), resumed: false }),
}));
jest.mock('@/onboarding/usePreparation', () => ({ usePreparation: () => ({ busy: false, problem: null, occurrence: 0, run: jest.fn(), missing: false, bringAgain: jest.fn() }) }));
jest.mock('@/onboarding/draft', () => ({ ...jest.requireActual<object>('@/onboarding/draft'), profileReady: () => true }));

const show = async (ui: React.ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);
const ready = (program: Schemas['Program'], profile = PROFILE): Progress => ({ profile, program, exercises: [], consented: false, planSeen: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockProgress = ready(typed([{ name: 'Push' }]));
});

describe('the plan: chips', () => {
  test('a typed program on no weekday: no "0 days", no "Goal: We pick", no empty chip; "1 day" counts the program\'s days', async () => {
    await show(<PlanScreen />);
    expect(screen.queryByText(/^0 days/)).toBeNull();
    expect(screen.queryByText(t('onboarding.plan.goal', { goal: t('onboarding.plan.goalName.DECIDE_FOR_ME') }))).toBeNull();
    expect(screen.getByText(t('onboarding.plan.days.one', { count: 1 }))).toBeOnTheScreen();
    expect(t('onboarding.plan.days.one', { count: 1 })).toBe('1 day');
    // The only chips are the ones with a value: here, the count.
    expect(screen.getByLabelText(t('onboarding.plan.reflectLabel')).children).toHaveLength(1);
  });

  test("days on weekdays: the count is the program's, and the weekday chip names them in the week's order", async () => {
    mockProgress = ready(typed([{ name: 'B', weekday: 'FRIDAY' }, { name: 'A', weekday: 'MONDAY' }, { name: 'C' }]), { ...PROFILE, goal: 'LOSE_FAT' } as Schemas['Profile']);
    await show(<PlanScreen />);
    expect(screen.getByText(t('onboarding.plan.goal', { goal: t('onboarding.plan.goalName.LOSE_FAT') }))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.days.other', { count: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(`${t('onboarding.schedule.dayShort.MONDAY')}, ${t('onboarding.schedule.dayShort.FRIDAY')}`)).toBeOnTheScreen();
  });
});

describe('the plan: cards', () => {
  test('the first workout is the normal surface card, not a second dark one', async () => {
    await show(<PlanScreen />);
    const card = screen.getByLabelText(t('onboarding.plan.workoutLabel'));
    expect(card).toHaveStyle({ backgroundColor: palettes.light.surface });
    expect(card).not.toHaveStyle({ backgroundColor: palettes.light.decisionBackground });
    expect(screen.getByText('Push')).toHaveStyle({ color: palettes.light.text });
  });
});

describe('the plan: the Monday switch when iOS says no', () => {
  const flip = async () =>
    act(async () => fireEvent(screen.getByLabelText(t('onboarding.plan.remind', { day: t('onboarding.schedule.dayName.MONDAY') })), 'valueChange', true));

  test('refused, even when iOS could still be asked: the one-line note and the way to iOS Settings', async () => {
    mockProgress = { ...ready(typed([{ name: 'Push' }])), consented: true, firstCall: '2026-11-02' };
    mockPermission.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await show(<PlanScreen />);
    await flip();
    expect(screen.getByText(t('onboarding.reminders.refused'))).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('settings.reminders.openSettings') })));
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('preparing', () => {
  test('one day is "1 day"', async () => {
    mockProgress = { profile: PROFILE, program: typed([{ name: 'Push' }]), exercises: [] };
    await show(<PreparingScreen />);
    expect(screen.getByText('Your program, 1 day')).toBeOnTheScreen();
  });

  test('several days keep the plural', async () => {
    mockProgress = { profile: PROFILE, program: typed([{ name: 'A' }, { name: 'B' }]), exercises: [] };
    await show(<PreparingScreen />);
    expect(screen.getByText('Your program, 2 days')).toBeOnTheScreen();
  });
});
