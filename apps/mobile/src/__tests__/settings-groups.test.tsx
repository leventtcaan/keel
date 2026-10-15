/**
 * Settings, the new face (K-982; ADR-070 #3, ADR-074 #4, ADR-036, ADR-069 #3): seven groups in one order, each row going to the
 * endpoint or the route that already does the work (Edit program, the gyms, the workout import, the profile, the consents,
 * the subscription, the account), and the health groups locked while the health data consent is not given. The old
 * sections' own behaviour stays in their tests (settings-screen.test.tsx and the section files).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useSyncExternalStore as mockUseSyncExternalStore } from 'react';

import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import SettingsScreen from '@/app/settings';
import { t } from '@/copy';
import { storeUnavailable } from '@/subscription/store';
import type { Appearance } from '@/theme/appearance';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

const day = (id: string, weekday?: Schemas['Weekday']): Schemas['ProgramDay'] => ({ id, nameKey: 'full_body_a', ...(weekday ? { weekday } : {}), exercises: [] });
const PROGRAM: Schemas['Program'] = {
  id: '11111111-1111-4111-8111-111111111111',
  source: 'GENERATED',
  days: [day('d1', 'MONDAY'), day('d2', 'WEDNESDAY'), day('d3', 'FRIDAY')],
  cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false },
} as Schemas['Program'];
const GYM = { id: 'g1', name: 'Club', current: true, platesKg: [], dumbbellsKg: [], machines: [] } as Schemas['Gym'];
// The profile's training days differ from the program's on purpose: the program's days are the one source.
const PROFILE: Schemas['Profile'] = {
  goal: 'BUILD_MUSCLE',
  sex: 'MALE',
  heightCm: 180,
  birthYear: 1990,
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['TUESDAY', 'THURSDAY'], checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
  food: { avoid: ['peanuts', 'shellfish'], budgetNote: 'kept' },
  units: 'METRIC',
};
const SUBSCRIPTION: Schemas['Subscription'] = { active: true, appUserId: '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b', status: 'ACTIVE', accessUntil: '2026-10-26T12:00:00Z' };

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
let program: Schemas['Program'] | null;
let gyms: Schemas['Gym'][];
let profile: Schemas['Profile'];
let consent: 'GRANTED' | 'NEVER_ASKED';
let profileRefused = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const api = createApiClient({
  baseUrl: 'https://api.example.test',
  accessToken: async () => 'tok',
  fetch: async (request: Request) => {
    const text = await request.text();
    const path = new URL(request.url).pathname;
    calls.push({ method: request.method, path, body: text === '' ? null : JSON.parse(text) });
    if (path === '/v1/program') return program === null ? json({ code: 'NOT_FOUND' }, 404) : json(program);
    if (path === '/v1/gyms') return json(gyms);
    if (path === '/v1/subscription') return json(SUBSCRIPTION);
    if (path === '/v1/profile' && request.method === 'GET') return json(profile);
    if (path === '/v1/profile' && request.method === 'PUT') {
      if (profileRefused) return json({ code: 'INTERNAL' }, 500);
      profile = JSON.parse(text);
      return json(profile);
    }
    if (path === '/v1/consents' && request.method === 'GET') {
      return json([{ kind: 'HEALTH_DATA', status: consent, ...(consent === 'GRANTED' ? { textVersion: t('consent.health_data.version') } : {}) }]);
    }
    if (path.startsWith('/v1/consents/') && request.method === 'PUT') {
      consent = 'GRANTED';
      return json({ status: 'GRANTED' });
    }
    return json({ code: 'NOT_FOUND' }, 404);
  },
});

let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockAppearance: Appearance = 'light';
const mockAppearanceListeners = new Set<() => void>();
const mockRemindersOff = { enabled: false, cue: '' };
const mockHealthWriteOff = { workouts: false, weighIns: false };
const mockServices = {
  api,
  units: { set: jest.fn(async (_system: string) => 'profile' as const) },
  appearance: {
    current: () => mockAppearance,
    subscribe: (listener: () => void) => {
      mockAppearanceListeners.add(listener);
      return () => mockAppearanceListeners.delete(listener);
    },
    set: jest.fn(async (next: Appearance) => {
      mockAppearance = next;
      mockAppearanceListeners.forEach((listener) => listener());
    }),
  },
  health: { available: true, requestRead: jest.fn(async () => {}) },
  importHealthWeights: jest.fn(async () => 0),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  signOut: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  purchases: storeUnavailable,
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(), forget: async () => {} },
  consents: {
    remember: jest.fn(async () => {}),
    granted: jest.fn(async () => consent === 'GRANTED'),
  },
  withdrawHealthData: jest.fn(async () => {}),
  report: jest.fn(),
  reminders: {
    current: () => mockRemindersOff,
    subscribe: () => () => {},
    permission: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  },
  healthWriting: { current: () => mockHealthWriteOff, subscribe: () => () => {}, shown: () => 'off' },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => mockUnits,
  useAppearance: () => mockUseSyncExternalStore(mockServices.appearance.subscribe, mockServices.appearance.current),
}));

beforeEach(() => {
  jest.clearAllMocks();
  calls = [];
  program = PROGRAM;
  gyms = [GYM];
  profile = PROFILE;
  consent = 'GRANTED';
  profileRefused = false;
  mockUnits = 'METRIC';
  mockAppearance = 'light';
  mockServices.health.available = true;
});

/** The provider the app's layout makes: the theme follows the appearance choice kept on the phone. */
function Themed({ children }: { children: React.ReactNode }) {
  const appearance = mockUseSyncExternalStore(mockServices.appearance.subscribe, mockServices.appearance.current);
  return <ThemeProvider appearance={appearance}>{children}</ThemeProvider>;
}
async function show() {
  await render(
    <Themed>
      <SettingsScreen />
    </Themed>,
  );
  await act(async () => {});
}
const button = (name: string) => screen.getByRole('button', { name });
async function press(name: string) {
  await fireEvent.press(button(name));
  await act(async () => {});
}
const GROUPS = ['appearance', 'training', 'food', 'reminders', 'health', 'subscription', 'account'] as const;
const GROUP_TITLE: Record<(typeof GROUPS)[number], string> = {
  appearance: t('settings.appearance.title'),
  training: t('settings.training.title'),
  food: t('settings.food.title'),
  reminders: t('settings.reminders.title'),
  health: t('settings.health.title'),
  subscription: t('settings.subscription.title'),
  account: t('settings.account.title'),
};
const headers = () => screen.getAllByRole('header').map((h) => within(h).queryByText(/./)?.props.children ?? h.props.children);

describe('the groups', () => {
  test('seven groups, in this order: Appearance, Training, Food, Reminders, Health and data, Subscription, Account', async () => {
    await show();
    const seen = headers().filter((name) => (Object.values(GROUP_TITLE) as string[]).includes(name));
    expect(seen).toEqual(GROUPS.map((g) => GROUP_TITLE[g]));
  });

  test('Units (kg and lb) sit in the Appearance group, before Training', async () => {
    await show();
    const order = headers();
    const units = order.indexOf(t('settings.units.title'));
    expect(units).toBeGreaterThan(order.indexOf(GROUP_TITLE.appearance));
    expect(units).toBeLessThan(order.indexOf(GROUP_TITLE.training));
    await press(t('settings.units.imperial'));
    expect(mockServices.units.set).toHaveBeenCalledWith('IMPERIAL');
  });
});

describe('theme', () => {
  test('Light, Dark and System are there, Light chosen until the person picks', async () => {
    await show();
    expect(button(t('settings.appearance.light'))).toBeSelected();
    expect(button(t('settings.appearance.dark'))).not.toBeSelected();
    expect(button(t('settings.appearance.system'))).not.toBeSelected();
  });

  test('choosing Dark keeps the choice and the whole screen takes the dark palette at once', async () => {
    await show();
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: palettes.light.background });
    await press(t('settings.appearance.dark'));
    expect(mockServices.appearance.set).toHaveBeenCalledWith('dark');
    expect(button(t('settings.appearance.dark'))).toBeSelected();
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: palettes.dark.background });
    await press(t('settings.appearance.light'));
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: palettes.light.background });
  });
});

describe('training', () => {
  test('Training days shows the program days own weekdays (never the profile\'s) and opens Edit program › days', async () => {
    await show();
    const line = ['MONDAY', 'WEDNESDAY', 'FRIDAY'].map((d) => t(`programEditor.weekdayShort.${d}`)).join(t('editProgram.dayList'));
    expect(button(`${t('settings.training.days')}, ${line}`)).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(t('programEditor.weekdayShort.TUESDAY')))).toBeNull();
    await press(`${t('settings.training.days')}, ${line}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part: 'days' } });
  });

  test('a program day with no weekday reads "Any day", as Edit does', async () => {
    program = { ...PROGRAM, days: [day('d1', 'MONDAY'), day('d2')] };
    await show();
    expect(button(`${t('settings.training.days')}, ${t('programEditor.weekdayShort.MONDAY')}${t('editProgram.dayList')}${t('editProgram.anyDay')}`)).toBeOnTheScreen();
  });

  test('Cardio shows the sessions the server planned (not a count of the phone) and opens the cardio editor', async () => {
    await show();
    const row = `${t('editProgram.cardio.title')}, ${t('editProgram.cardio.row', { sessions: 3, minutes: 30 })}`;
    await press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part: 'cardio' } });
  });

  test.each([
    ['turned off', { ...PROGRAM.cardio!, sessionsPerWeek: 0, sessions: [] }],
    ['not planned at all', undefined],
  ])('Cardio %s says Off and still opens the editor', async (_, cardio) => {
    program = { ...PROGRAM, cardio } as Schemas['Program'];
    await show();
    await press(`${t('editProgram.cardio.title')}, ${t('editProgram.cardio.off')}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part: 'cardio' } });
  });

  test('Gyms shows the one in use and opens the gyms', async () => {
    await show();
    await press(`${t('settings.gyms')}, Club`);
    expect(mockPush).toHaveBeenCalledWith('/gyms');
  });

  test('with no gym yet, Gyms says so', async () => {
    gyms = [];
    await show();
    expect(button(`${t('settings.gyms')}, ${t('settings.training.noGym')}`)).toBeOnTheScreen();
  });

  test('Import workouts opens the workout import (Strong, Hevy)', async () => {
    await show();
    await press(`${t('settings.training.import')}, ${t('settings.training.importFrom')}`);
    expect(mockPush).toHaveBeenCalledWith('/import');
  });

  test('the program and the gyms come from the server, read when Settings opens', async () => {
    await show();
    expect(calls.filter((c) => c.method === 'GET').map((c) => c.path)).toEqual(expect.arrayContaining(['/v1/program', '/v1/gyms']));
  });

  test('a program that cannot be read: the rows say so and do not show a guess', async () => {
    program = null;
    await show();
    expect(button(`${t('settings.training.days')}, ${t('settings.training.none')}`)).toBeOnTheScreen();
  });
});

describe('food', () => {
  test('the foods to avoid come from the profile; with none, None', async () => {
    await show();
    expect(button(`${t('settings.food.avoid')}, peanuts, shellfish`)).toBeOnTheScreen();
  });

  test('none avoided says None', async () => {
    profile = { ...PROFILE, food: {} };
    await show();
    expect(button(`${t('settings.food.avoid')}, ${t('settings.food.none')}`)).toBeOnTheScreen();
  });

  test('editing sends the whole profile back with the new list, keeping the rest of what the profile holds', async () => {
    await show();
    await press(`${t('settings.food.avoid')}, peanuts, shellfish`);
    await fireEvent.changeText(screen.getByLabelText(t('settings.food.label')), ' peanuts, Gluten ,, gluten ');
    await press(t('settings.food.save'));
    const put = calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile');
    expect(put?.body).toEqual({ ...PROFILE, food: { avoid: ['peanuts', 'Gluten', 'gluten'], budgetNote: 'kept' } });
    expect(button(`${t('settings.food.avoid')}, peanuts, Gluten, gluten`)).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('settings.food.label'))).toBeNull();
  });

  test('emptying the field saves an empty list', async () => {
    await show();
    await press(`${t('settings.food.avoid')}, peanuts, shellfish`);
    await fireEvent.changeText(screen.getByLabelText(t('settings.food.label')), '');
    await press(t('settings.food.save'));
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile')?.body).toMatchObject({ food: { avoid: [] } });
    expect(button(`${t('settings.food.avoid')}, ${t('settings.food.none')}`)).toBeOnTheScreen();
  });

  test('a save that does not reach the server says so and keeps what was shown', async () => {
    await show();
    await press(`${t('settings.food.avoid')}, peanuts, shellfish`);
    await fireEvent.changeText(screen.getByLabelText(t('settings.food.label')), 'eggs');
    profileRefused = true;
    await press(t('settings.food.save'));
    expect(screen.getByText(t('settings.food.failed'))).toBeOnTheScreen();
    expect(profile.food?.avoid).toEqual(['peanuts', 'shellfish']);
    // What was typed stays, to try again.
    expect(screen.getByLabelText(t('settings.food.label'))).toHaveProp('value', 'eggs');
  });

  test('Cancel closes the editor and sends nothing', async () => {
    await show();
    await press(`${t('settings.food.avoid')}, peanuts, shellfish`);
    await press(t('settings.food.cancel'));
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    expect(screen.queryByLabelText(t('settings.food.label'))).toBeNull();
  });
});

describe('without the health data consent', () => {
  beforeEach(() => {
    consent = 'NEVER_ASKED';
  });

  test('Food is locked: it says what it needs, cannot be opened, and the profile is not asked for the list', async () => {
    await show();
    const row = button(`${t('settings.food.avoid')}, ${t('settings.food.locked')}`);
    expect(row).toBeDisabled();
    await fireEvent.press(row);
    expect(screen.queryByLabelText(t('settings.food.label'))).toBeNull();
    expect(calls.some((c) => c.path === '/v1/profile')).toBe(false);
  });

  test('Health and data is locked: the consent shows Not allowed with a way to allow it; the Apple Health switches and the weigh-in import are not offered', async () => {
    await show();
    // Both rows, Health data and Apple Health, say Not allowed; only the first can be allowed.
    expect(screen.getAllByText(t('settings.consents.notAllowed'))).toHaveLength(2);
    expect(button(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`)).toBeEnabled();
    expect(screen.getByText(t('settings.health.locked'))).toBeOnTheScreen();
    expect(screen.queryByText(t('settings.healthWrite.title'))).toBeNull();
    expect(screen.queryByText(t('settings.import.weighIns'))).toBeNull();
  });

  test('allowing the consent unlocks both at once', async () => {
    await show();
    await press(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`);
    expect(button(`${t('settings.food.avoid')}, peanuts, shellfish`)).toBeEnabled();
    expect(screen.queryByText(t('settings.health.locked'))).toBeNull();
    expect(screen.getByText(t('settings.healthWrite.title'))).toBeOnTheScreen();
  });

  test('training, reminders, the subscription and the account do not wait for the consent', async () => {
    await show();
    expect(button(`${t('settings.training.days')}, ${['MONDAY', 'WEDNESDAY', 'FRIDAY'].map((d) => t(`programEditor.weekdayShort.${d}`)).join(t('editProgram.dayList'))}`)).toBeEnabled();
    expect(button(t('settings.reminders.turnOn'))).toBeEnabled();
    expect(button(t('settings.signOut.title'))).toBeEnabled();
  });
});

describe('health and data, with the consent', () => {
  test('the consents, the Apple Health switches and the weigh-in import sit under one group, and workouts are not imported twice', async () => {
    await show();
    const order = headers();
    const group = order.indexOf(GROUP_TITLE.health);
    expect(order.indexOf(t('settings.consents.title'))).toBeGreaterThan(group);
    expect(order.indexOf(t('settings.healthWrite.title'))).toBeGreaterThan(group);
    expect(order.indexOf(t('settings.import.title'))).toBeLessThan(order.indexOf(GROUP_TITLE.subscription));
    expect(screen.getByText(t('settings.import.weighIns'))).toBeOnTheScreen();
    expect(screen.queryAllByText(t('settings.import.workouts'))).toHaveLength(0);
  });
});

describe('reminders (ADR-036)', () => {
  test('the three kinds on and off, and the routine sentence; no time picker, no weigh-in reminder', async () => {
    await show();
    expect(button(t('settings.reminders.turnOn'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('settings.reminders.cue.label'))).toBeOnTheScreen();
    expect(screen.queryByText(/\d\d:\d\d/)).toBeNull();
    expect(screen.queryByText(/monday call/i)).toBeNull();
    expect(screen.queryByText(/weigh-in reminder/i)).toBeNull();
    expect(screen.queryByRole('adjustable')).toBeNull();
  });
});

describe('subscription', () => {
  test('what the server says, with its date; the plan is not named (the contract does not carry it)', async () => {
    await show();
    expect(screen.getByText(t('settings.subscription.status.ACTIVE', { date: 'Oct 26, 2026' }))).toBeOnTheScreen();
    expect(screen.queryByText(/yearly|monthly|annual/i)).toBeNull();
  });
});

describe('account', () => {
  test('Export my data, Sign out and Delete account are the old ways', async () => {
    await show();
    await press(t('settings.export.title'));
    expect(mockServices.exportData).toHaveBeenCalledTimes(1);
    await press(t('settings.signOut.title'));
    expect(mockServices.signOut).toHaveBeenCalledTimes(1);
    await press(t('settings.delete.title'));
    expect(screen.getByText(t('settings.delete.confirmTitle'))).toBeOnTheScreen();
    expect(mockServices.deleteAccount).not.toHaveBeenCalled();
  });
});

describe('every row can be reached with a screen reader', () => {
  test('rows are buttons at least as tall as a touch target, named with their value', async () => {
    await show();
    const rows = [t('settings.training.days'), t('editProgram.cardio.title'), t('settings.gyms'), t('settings.training.import'), t('settings.food.avoid')];
    for (const name of rows) {
      const row = screen.getByRole('button', { name: new RegExp(`^${name},`) });
      const flat = [row.props.style].flat(Infinity) as ({ minHeight?: number } | undefined)[];
      expect(Math.max(...flat.map((s) => s?.minHeight ?? 0))).toBeGreaterThanOrEqual(44);
    }
  });
});
