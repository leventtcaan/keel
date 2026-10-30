/**
 * Settings, grouped lists (K-982, K-1043, K-1062; ADR-070 #3, Ek 2 #2, #4; ADR-074 #4, ADR-036, ADR-069 #3, ADR-088 #3): the
 * groups in one order, each row going to the endpoint or the route that already does the work (Edit program, the workout
 * import, the profile, the consents, the subscription, the account), a chevron on a row only where it opens a page, and the
 * health rows locked while the health data consent is not given. The pages under Settings (`settings-detail`: foods you
 * avoid, your routine, the consents, Add to Apple Health, bringing in weigh-ins, data sources) are here too: they hold what
 * Settings used to hold inline. The sections' own behaviour stays in their tests (settings-screen.test.tsx and the section files).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useSyncExternalStore as mockUseSyncExternalStore } from 'react';
import { Alert, Linking } from 'react-native';

import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import SettingsDetailScreen from '@/app/settings-detail';
import SettingsScreen from '@/app/settings';
import { t } from '@/copy';
import { storeUnavailable } from '@/subscription/store';
import type { Appearance } from '@/theme/appearance';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];

// Each symbol is findable by its name, so a test can say which rows have a chevron.
jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { name: string; testID?: string }) => createElement('SymbolView', { ...props, testID: props.testID ?? `symbol-${props.name}` }) };
});

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => mockBack() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

const day = (id: string, weekday?: Schemas['Weekday']): Schemas['ProgramDay'] => ({ id, nameKey: 'full_body_a', ...(weekday ? { weekday } : {}), exercises: [] });
const PROGRAM: Schemas['Program'] = {
  id: '11111111-1111-4111-8111-111111111111',
  source: 'GENERATED',
  days: [day('d1', 'MONDAY'), day('d2', 'WEDNESDAY'), day('d3', 'FRIDAY')],
  cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false },
} as Schemas['Program'];
// The profile's training days differ from the program's on purpose: the program's days are the one source.
const PROFILE: Schemas['Profile'] = {
  goal: 'BUILD_MUSCLE',
  sex: 'MALE',
  heightCm: 180,
  birthYear: 1990,
  activityLevel: 'LOW_ACTIVE',
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['TUESDAY', 'THURSDAY'], checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
  food: { avoid: ['peanuts', 'shellfish'], budgetNote: 'kept' },
  units: 'METRIC',
};
const SUBSCRIPTION: Schemas['Subscription'] = { active: true, appUserId: '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b', status: 'ACTIVE', accessUntil: '2026-10-26T12:00:00Z' };

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
let program: Schemas['Program'] | null;
let profile: Schemas['Profile'];
let consent: 'GRANTED' | 'NEVER_ASKED';
let profileRefused = false;
let profileGate: Promise<void> | null = null; // a profile read waits for it, where a test holds the answer back
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const api = createApiClient({
  baseUrl: 'https://api.example.test',
  accessToken: async () => 'tok',
  fetch: async (request: Request) => {
    const text = await request.text();
    const path = new URL(request.url).pathname;
    calls.push({ method: request.method, path, body: text === '' ? null : JSON.parse(text) });
    if (path === '/v1/program') return program === null ? json({ code: 'NOT_FOUND' }, 404) : json(program);
    if (path === '/v1/subscription') return json(SUBSCRIPTION);
    if (path === '/v1/profile' && request.method === 'GET') {
      await profileGate;
      return json(profile);
    }
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
    turnOn: jest.fn(async () => ({ granted: true, canAskAgain: false })),
    turnOff: jest.fn(async () => {}),
    setCue: jest.fn(async (_text: string) => {}),
    keepSchedule: jest.fn(async (_schedule: unknown) => {}),
  },
  healthWriting: { current: () => mockHealthWriteOff, subscribe: () => () => {}, shown: () => 'off', turnOn: jest.fn(async (_which: string) => true), turnOff: jest.fn(async (_which: string) => {}) },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => mockUnits,
  useAppearance: () => mockUseSyncExternalStore(mockServices.appearance.subscribe, mockServices.appearance.current),
}));

// Delete account asks in a system alert (ADR-087 #1).
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  calls = [];
  program = PROGRAM;
  profile = PROFILE;
  consent = 'GRANTED';
  profileRefused = false;
  profileGate = null;
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
/** A page under Settings: what a row there opens (the `part` it was pushed with). */
async function showDetail(part: string) {
  mockParams = { part };
  await render(
    <Themed>
      <SettingsDetailScreen />
    </Themed>,
  );
  await act(async () => {});
}
const button = (name: string) => screen.getByRole('button', { name });
async function press(name: string) {
  await fireEvent.press(button(name));
  await act(async () => {});
}
const GROUPS = ['appearance', 'units', 'training', 'food', 'profile', 'reminders', 'health', 'subscription', 'sources', 'account'] as const;
const GROUP_TITLE: Record<(typeof GROUPS)[number], string> = {
  appearance: t('settings.appearance.title'),
  units: t('settings.units.title'),
  sources: t('settings.sources.title'),
  training: t('settings.training.title'),
  food: t('settings.food.title'),
  profile: t('settings.profile.title'),
  reminders: t('settings.reminders.title'),
  health: t('settings.health.title'),
  subscription: t('settings.subscription.title'),
  account: t('settings.account.title'),
};
const headers = () => screen.getAllByRole('header').map((h) => within(h).queryByText(/./)?.props.children ?? h.props.children);

describe('the groups', () => {
  test('the groups, in this order: Appearance, Units, Training, Food, About you, Reminders, Health and data, Subscription, Data sources, Account', async () => {
    await show();
    const seen = headers().filter((name) => (Object.values(GROUP_TITLE) as string[]).includes(name));
    expect(seen).toEqual(GROUPS.map((g) => GROUP_TITLE[g]));
  });

  test('Units are a group of their own, a segmented choice (kg and lb) that keeps the choice', async () => {
    await show();
    expect(headers()).toContain(t('settings.units.title'));
    expect(button(t('settings.units.metric'))).toBeSelected();
    expect(button(t('settings.units.imperial'))).not.toBeSelected();
    await press(t('settings.units.imperial'));
    expect(mockServices.units.set).toHaveBeenCalledWith('IMPERIAL');
  });

  test('Settings has no Back of its own: the way back is the stack header (ADR-070 Ek 2 #4)', async () => {
    await show();
    expect(screen.queryByText(new RegExp(`${t('settings.backMark')}`))).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Back|Today)$/ })).toBeNull();
  });

  test('a row has a chevron only where it opens a page; one that acts in place, or only says, has none', async () => {
    await show();
    // Opens a page.
    for (const name of [
      new RegExp(`^${t('settings.training.days')},`),
      new RegExp(`^${t('settings.food.avoid')},`),
      ...['goal', 'checkIn', 'height', 'activity', 'born'].map((row) => new RegExp(`^${t(`settings.profile.${row}`)},`)),
      new RegExp(`^${t('settings.reminders.routine')}`),
      new RegExp(`^${t('settings.health.consent')},`),
      new RegExp(`^${t('settings.healthWrite.title')}`),
      new RegExp(`^${t('settings.sources.food')},`),
    ]) {
      expect(within(screen.getByRole('button', { name })).getAllByTestId('symbol-chevron.right')).toHaveLength(1);
    }
    // Acts in place (an alert, a file, Apple's page) or only states.
    for (const name of [t('settings.export.title'), t('settings.signOut.title'), t('settings.delete.title'), t('settings.subscription.manage')]) {
      const row = screen.queryByRole('button', { name });
      if (row !== null) expect(within(row).queryAllByTestId('symbol-chevron.right')).toHaveLength(0);
    }
  });

  test('Sign out and Delete account are destructive rows: the warning colour; Export is not', async () => {
    await show();
    const ink = (name: string) => within(button(name)).getByText(name);
    expect(ink(t('settings.signOut.title'))).toHaveStyle({ color: palettes.light.warn });
    expect(ink(t('settings.delete.title'))).toHaveStyle({ color: palettes.light.warn });
    expect(ink(t('settings.export.title'))).toHaveStyle({ color: palettes.light.text });
  });

  test('under a row there is one line at most: a group has a footer of one short line or none', async () => {
    await show();
    // The long reminders paragraph is on the routine page; the line under the switch names the three kinds in one line.
    expect(screen.queryByText(/Three kinds, never more/)).toBeNull();
    expect(screen.getByText(t('settings.reminders.kinds'))).toBeOnTheScreen();
    expect(t('settings.reminders.kinds').split(/\s+/).length).toBeLessThanOrEqual(12);
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
    expect(mockPush).toHaveBeenCalledWith('/edit-program');
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

  test('Import workouts opens the workout import (Strong, Hevy)', async () => {
    await show();
    await press(`${t('settings.training.import')}, ${t('settings.training.importFrom')}`);
    expect(mockPush).toHaveBeenCalledWith('/import');
  });

  test('the program comes from the server, read when Settings opens; the gyms are not asked for (K-1062)', async () => {
    await show();
    const paths = calls.filter((c) => c.method === 'GET').map((c) => c.path);
    expect(paths).toContain('/v1/program');
    expect(paths).not.toContain('/v1/gyms');
    expect(screen.queryByText(/gym/i)).toBeNull();
  });

  test('a program that cannot be read: the rows say so and do not show a guess', async () => {
    program = null;
    await show();
    expect(button(`${t('settings.training.days')}, ${t('settings.training.none')}`)).toBeOnTheScreen();
  });
});

describe('food', () => {
  test('the foods to avoid come from the profile, on the row; the row opens the page that edits them', async () => {
    await show();
    await press(`${t('settings.food.avoid')}, Peanuts, Shellfish`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'food' } });
    // The editor is not inline: nothing to type into on Settings itself.
    expect(screen.queryByLabelText(t('settings.food.label'))).toBeNull();
  });

  test('three or more foods say how many; the page has them all', async () => {
    profile = { ...PROFILE, food: { avoid: ['peanuts', 'shellfish', 'Kiwi'] } };
    await show();
    expect(button(`${t('settings.food.avoid')}, ${t('settings.food.count', { count: 3 })}`)).toBeOnTheScreen();
  });

  test('none avoided says None', async () => {
    profile = { ...PROFILE, food: {} };
    await show();
    expect(button(`${t('settings.food.avoid')}, ${t('settings.food.none')}`)).toBeOnTheScreen();
  });

  describe('the page Foods you avoid', () => {
    const chip = (name: string) => screen.getByRole('button', { name });
    const chipLabel = (food: string) => t(`settings.food.common.${food}`);

    test('is titled by its row and holds the foods as chips: the common ones, the stored ones selected, no field to fill', async () => {
      await showDetail('food');
      expect(screen.getByRole('header', { name: t('settings.food.avoid') })).toBeOnTheScreen();
      for (const food of ['pork', 'beef', 'shellfish', 'fish', 'dairy', 'eggs', 'gluten', 'nuts', 'peanuts', 'soy', 'alcohol']) {
        expect(chip(chipLabel(food))).toBeOnTheScreen();
      }
      expect(chip(chipLabel('peanuts'))).toBeSelected();
      expect(chip(chipLabel('shellfish'))).toBeSelected();
      expect(chip(chipLabel('pork'))).not.toBeSelected();
      expect(screen.queryByLabelText(t('settings.food.label'))).toBeNull();
      expect(chip(t('settings.food.save'))).toBeDisabled(); // nothing is different yet
    });

    test('tapping chips then Save sends the whole profile back with the new list, keeping the rest, and closes the page', async () => {
      await showDetail('food');
      await fireEvent.press(chip(chipLabel('gluten')));
      await fireEvent.press(chip(chipLabel('peanuts'))); // taken off
      await press(t('settings.food.save'));
      const put = calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile');
      expect(put?.body).toEqual({ ...PROFILE, food: { avoid: ['shellfish', 'gluten'], budgetNote: 'kept' } });
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    test('"Add your own" opens one small field; what is added is a selected chip beside the common ones, once however it is written', async () => {
      await showDetail('food');
      await press(t('settings.food.addOwn'));
      await fireEvent.changeText(screen.getByLabelText(t('settings.food.label')), ' Kiwi ');
      await press(t('settings.food.add'));
      expect(chip('Kiwi')).toBeSelected();
      await press(t('settings.food.addOwn'));
      await fireEvent.changeText(screen.getByLabelText(t('settings.food.label')), 'kiwi, PEANUTS');
      await press(t('settings.food.add'));
      await press(t('settings.food.save'));
      expect(calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile')?.body).toMatchObject({ food: { avoid: ['peanuts', 'shellfish', 'Kiwi'] } });
    });

    test('a food stored in other words is a chip of its own, taken off with a tap', async () => {
      profile = { ...PROFILE, food: { avoid: ['Peanuts', 'kiwi'] } };
      await showDetail('food');
      expect(chip(chipLabel('peanuts'))).toBeSelected(); // case does not matter
      await fireEvent.press(chip('kiwi'));
      await press(t('settings.food.save'));
      expect(calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile')?.body).toMatchObject({ food: { avoid: ['Peanuts'] } });
    });

    test('taking every chip off saves an empty list', async () => {
      await showDetail('food');
      await fireEvent.press(chip(chipLabel('peanuts')));
      await fireEvent.press(chip(chipLabel('shellfish')));
      await press(t('settings.food.save'));
      expect(calls.find((c) => c.method === 'PUT' && c.path === '/v1/profile')?.body).toMatchObject({ food: { avoid: [] } });
    });

    test('a save that does not reach the server says so, keeps the chips as they were set, and stays', async () => {
      await showDetail('food');
      await fireEvent.press(chip(chipLabel('eggs')));
      profileRefused = true;
      await press(t('settings.food.save'));
      expect(screen.getByText(t('settings.food.failed'))).toBeOnTheScreen();
      expect(profile.food?.avoid).toEqual(['peanuts', 'shellfish']);
      expect(chip(chipLabel('eggs'))).toBeSelected();
      expect(mockBack).not.toHaveBeenCalled();
    });

    test('without the health data consent the page says what it needs, gives the consent right there, and asks the profile for nothing', async () => {
      consent = 'NEVER_ASKED';
      await showDetail('food');
      expect(screen.getByText(t('settings.food.locked'))).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: t('settings.food.common.pork') })).toBeNull();
      expect(calls.some((c) => c.path === '/v1/profile')).toBe(false);
      // The button that grants it: the page then opens the chips, with the list read afresh.
      await press(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`);
      expect(chip(chipLabel('peanuts'))).toBeSelected();
    });
  });
});

describe('about you (K-1062)', () => {
  const rowName = (key: string, value: string) => `${t(`settings.profile.${key}`)}, ${value}`;
  const put = () => calls.filter((c) => c.method === 'PUT' && c.path === '/v1/profile');

  test('five rows, each with its answer from the profile, each opening a page of its own', async () => {
    await show();
    const group = within(screen.getByTestId('group-profile-card'));
    expect(group.getAllByRole('button').map((row) => row.props.accessibilityLabel)).toEqual([
      rowName('goal', t('onboarding.goal.build_muscle.title')),
      rowName('checkIn', t('onboarding.schedule.dayName.MONDAY')),
      rowName('height', '180 cm'),
      rowName('activity', t('onboarding.activity.LOW_ACTIVE')),
      rowName('born', '1990'),
    ]);
    await press(rowName('checkIn', t('onboarding.schedule.dayName.MONDAY')));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'checkin' } });
  });

  test('the height reads in the user\'s units', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    expect(button(rowName('height', t('units.feetInches', { feet: 5, inches: 11 })))).toBeOnTheScreen();
  });

  test('a profile that cannot be read says so and shows no guess; an activity never asked says Not set', async () => {
    profile = { ...PROFILE, activityLevel: undefined };
    await show();
    expect(button(rowName('activity', t('settings.profile.notSet')))).toBeOnTheScreen();
    await screen.unmount();
    profileRefused = false;
    const failing = jest.spyOn(api, 'GET').mockResolvedValue({ data: undefined, error: {}, response: new Response(null, { status: 500 }) } as never);
    try {
      await show();
      expect(within(screen.getByTestId('group-profile-card')).getByText(t('settings.profile.unread'))).toBeOnTheScreen();
      expect(screen.queryByText(t('onboarding.goal.build_muscle.title'))).toBeNull();
    } finally {
      failing.mockRestore();
    }
  });

  test.each([
    ['goal', 'onboarding.goal.lose_fat.title', { goal: 'LOSE_FAT' }],
    ['goal', 'onboarding.goal.decide_for_me.title', { goal: 'DECIDE_FOR_ME' }],
    ['activity', 'onboarding.activity.VERY_ACTIVE', { activityLevel: 'VERY_ACTIVE' }],
  ])('the %s page: a choice, then Save writes it into the profile as it stands now, and closes the page', async (part, choice, change) => {
    await showDetail(part);
    expect(button(t('settings.profile.save'))).toBeDisabled(); // nothing is different yet
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${t(choice)}`) }));
    await press(t('settings.profile.save'));
    expect(put()).toHaveLength(1);
    expect(put()[0].body).toEqual({ ...PROFILE, ...change });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the check-in day: seven days to tap; the choice goes into the schedule only, and the reminders keep the new schedule', async () => {
    await showDetail('checkin');
    expect(screen.getAllByRole('button').filter((b) => b.props.accessibilityState?.selected === true)).toHaveLength(1);
    expect(button(t('onboarding.schedule.dayName.MONDAY'))).toBeSelected();
    await press(t('onboarding.schedule.dayName.SUNDAY'));
    await press(t('settings.profile.save'));
    expect(put()[0].body).toEqual({ ...PROFILE, schedule: { ...PROFILE.schedule, checkInDay: 'SUNDAY' } });
    expect(mockServices.reminders.keepSchedule).toHaveBeenCalledWith(expect.objectContaining({ checkInDay: 'SUNDAY', trainingDays: ['TUESDAY', 'THURSDAY'] }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('a change never writes from a copy the page read earlier: the profile is read again at Save, so another edit made meanwhile is kept', async () => {
    await showDetail('goal');
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${t('onboarding.goal.lose_fat.title')}`) }));
    // Meanwhile the training days (the program's owner), the foods and the units changed on the server.
    profile = { ...PROFILE, units: 'IMPERIAL', food: { avoid: ['eggs'] }, schedule: { ...PROFILE.schedule, trainingDays: ['MONDAY', 'FRIDAY', 'SUNDAY'] } };
    await press(t('settings.profile.save'));
    expect(put()[0].body).toEqual({ ...profileBefore(), goal: 'LOSE_FAT' });
  });

  const profileBefore = () => ({ ...PROFILE, units: 'IMPERIAL', food: { avoid: ['eggs'] }, schedule: { ...PROFILE.schedule, trainingDays: ['MONDAY', 'FRIDAY', 'SUNDAY'] } });

  test('Save is off while it works, and a save the server refuses says so, keeps the choice and stays', async () => {
    await showDetail('goal');
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${t('onboarding.goal.lose_fat.title')}`) }));
    profileRefused = true;
    await press(t('settings.profile.save'));
    expect(screen.getByText(t('settings.profile.failed'))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: new RegExp(`^${t('onboarding.goal.lose_fat.title')}`) })).toBeChecked();
    expect(profile.goal).toBe('BUILD_MUSCLE');
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('the height page: a wheel in the user\'s units; Save stays off until the wheel is moved; metric saves whole centimetres', async () => {
    await showDetail('height');
    expect(button(t('settings.profile.save'))).toBeDisabled();
    const wheel = screen.getByLabelText(t('settings.profile.height'));
    expect(wheel).toHaveProp('accessibilityValue', { text: '180 cm' });
    await act(async () => wheel.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    await press(t('settings.profile.save'));
    expect(put()[0].body).toEqual({ ...PROFILE, heightCm: 181 });
  });

  test('the height page in imperial: feet and inches, saved as the centimetres the profile keeps', async () => {
    mockUnits = 'IMPERIAL';
    await showDetail('height');
    const wheel = screen.getByLabelText(t('settings.profile.height'));
    expect(wheel).toHaveProp('accessibilityValue', { text: t('units.feetInches', { feet: 5, inches: 11 }) });
    await act(async () => wheel.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    await press(t('settings.profile.save'));
    expect(put()[0].body).toMatchObject({ heightCm: 183 }); // 6 ft 0 in
  });

  test('the year of birth page: a wheel of the years an adult can be born in; saved as that year', async () => {
    await showDetail('born');
    const wheel = screen.getByLabelText(t('settings.profile.born'));
    expect(wheel).toHaveProp('accessibilityValue', { text: '1990 year' });
    await act(async () => wheel.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    await press(t('settings.profile.save'));
    expect(put()[0].body).toEqual({ ...PROFILE, birthYear: 1989 });
  });

  test('a profile that cannot be read: the page says so and offers nothing to save', async () => {
    const failing = jest.spyOn(api, 'GET').mockResolvedValue({ data: undefined, error: {}, response: new Response(null, { status: 500 }) } as never);
    try {
      await showDetail('goal');
      expect(screen.getByText(t('settings.profile.unread'))).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: t('settings.profile.save') })).toBeNull();
    } finally {
      failing.mockRestore();
    }
  });

  test.each(['goal', 'checkin', 'height', 'activity', 'born'])('the %s page is titled by its row', async (part) => {
    await showDetail(part);
    const key = { goal: 'goal', checkin: 'checkIn', height: 'height', activity: 'activity', born: 'born' }[part];
    expect(screen.getByRole('header', { name: t(`settings.profile.${key}`) })).toBeOnTheScreen();
  });
});

describe('legal (K-1062)', () => {
  const OLD = { terms: process.env.EXPO_PUBLIC_TERMS_URL, privacy: process.env.EXPO_PUBLIC_PRIVACY_URL };
  afterEach(() => {
    process.env.EXPO_PUBLIC_TERMS_URL = OLD.terms;
    process.env.EXPO_PUBLIC_PRIVACY_URL = OLD.privacy;
  });

  test('the Privacy Policy and the Terms of Use are rows that open their addresses', async () => {
    process.env.EXPO_PUBLIC_TERMS_URL = 'https://example.test/terms/';
    process.env.EXPO_PUBLIC_PRIVACY_URL = 'https://example.test/privacy/';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await show();
    expect(headers()).toContain(t('settings.legal.title'));
    await press(t('subscription.privacy'));
    expect(open).toHaveBeenLastCalledWith('https://example.test/privacy/');
    await press(t('subscription.terms'));
    expect(open).toHaveBeenLastCalledWith('https://example.test/terms/');
    open.mockRestore();
  });

  test('an address the build does not have is left out, never a dead link', async () => {
    process.env.EXPO_PUBLIC_TERMS_URL = 'https://example.test/terms/';
    delete process.env.EXPO_PUBLIC_PRIVACY_URL;
    await show();
    expect(screen.queryByRole('button', { name: t('subscription.privacy') })).toBeNull();
    expect(button(t('subscription.terms'))).toBeOnTheScreen();
  });
});

describe('without the health data consent', () => {
  beforeEach(() => {
    consent = 'NEVER_ASKED';
  });

  test('Food says what it needs and still opens its page, where the consent is a button; the profile is not asked for the list', async () => {
    await show();
    const row = button(`${t('settings.food.avoid')}, ${t('settings.food.locked')}`);
    expect(row).toBeEnabled();
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'food' } });
    // About you reads the profile, but it never asks for the foods: the server leaves them out without the consent.
    expect(calls.filter((c) => c.path === '/v1/profile').every((c) => c.method === 'GET')).toBe(true);
  });

  test('Health and data: the consent says Not allowed and opens its page, where it can be allowed; the weigh-in import row is locked', async () => {
    await show();
    await press(`${t('settings.health.consent')}, ${t('settings.consents.notAllowed')}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'consent' } });
    const importRow = button(`${t('settings.import.title')}, ${t('settings.health.needsConsent')}`);
    expect(importRow).toBeEnabled(); // it opens a page that gives the consent, not a dead end
    await screen.unmount();
    await showDetail('consent');
    expect(button(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`)).toBeEnabled();
  });

  test('the weigh-in import page says why it is not offered, does not offer it, and gives the consent as a button', async () => {
    await showDetail('import');
    expect(screen.getByText(t('settings.health.locked'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.import.importLabel', { what: t('settings.import.weighIns') }) })).toBeNull();
    await press(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`);
    expect(screen.getByRole('button', { name: t('settings.import.importLabel', { what: t('settings.import.weighIns') }) })).toBeEnabled();
  });

  test('the Apple Health write switches do not wait for the read consent (ADR-018 §1): their row opens, and a switch left on can always be turned off', async () => {
    await show();
    expect(button(t('settings.healthWrite.title'))).toBeEnabled();
    await press(t('settings.healthWrite.title'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'write' } });
    await screen.unmount();
    await showDetail('write');
    await fireEvent(screen.getByRole('switch', { name: t('settings.healthWrite.switchLabel', { what: t('settings.healthWrite.workouts') }) }), 'valueChange', true);
    await act(async () => {});
    expect(mockServices.healthWriting.turnOn).toHaveBeenCalledWith('workouts');
  });

  test('allowing the consent on its page unlocks Food and the import when Settings is in view again', async () => {
    await showDetail('consent');
    await press(`${t('settings.consents.allow')} ${t('settings.consents.HEALTH_DATA')}`);
    expect(screen.getAllByText(t('settings.consents.allowed'))).toHaveLength(1);
    await screen.unmount();
    await show();
    expect(button(`${t('settings.food.avoid')}, Peanuts, Shellfish`)).toBeEnabled();
    expect(button(t('settings.import.title'))).toBeEnabled();
    await press(t('settings.import.title'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'import' } });
    await screen.unmount();
    await showDetail('import');
    expect(screen.getByText(t('settings.import.note'))).toBeOnTheScreen();
  });

  test('withdrawing on the consent page locks Food again; allowed again, the profile is read afresh, never the old list', async () => {
    consent = 'GRANTED';
    await showDetail('consent');
    // The consent goes (the server deletes the list with it); the withdrawal path of the phone is stood in by the fake.
    mockServices.withdrawHealthData.mockImplementationOnce(async () => {
      consent = 'NEVER_ASKED';
      profile = { ...PROFILE, food: {} };
    });
    await press(`${t('settings.consents.withdraw')} ${t('settings.consents.HEALTH_DATA')}`);
    await press(t('settings.withdrawConfirm.confirm'));
    await screen.unmount();
    await show();
    expect(button(`${t('settings.food.avoid')}, ${t('settings.food.locked')}`)).toBeEnabled();

    // Allowed again, the new read is held back: until it answers, the old list must not be on the screen.
    await screen.unmount();
    consent = 'GRANTED';
    profile = { ...PROFILE, food: { avoid: ['eggs'] } };
    let release = () => {};
    profileGate = new Promise<void>((resolve) => (release = resolve));
    calls = [];
    await show();
    expect(screen.queryByText(/peanuts|shellfish/)).toBeNull();
    expect(calls.some((c) => c.method === 'GET' && c.path === '/v1/profile')).toBe(true);
    await act(async () => release());
    expect(button(`${t('settings.food.avoid')}, Eggs`)).toBeOnTheScreen();
  });

  test('training, reminders, the subscription and the account do not wait for the consent', async () => {
    await show();
    expect(button(`${t('settings.training.days')}, ${['MONDAY', 'WEDNESDAY', 'FRIDAY'].map((d) => t(`programEditor.weekdayShort.${d}`)).join(t('editProgram.dayList'))}`)).toBeEnabled();
    expect(screen.getByRole('switch', { name: t('settings.reminders.title') })).toBeEnabled();
    expect(button(t('settings.signOut.title'))).toBeEnabled();
  });
});

describe('health and data, with the consent', () => {
  test('four rows in one group: the two consents with their state, Add to Apple Health, bringing in history; each opens its page', async () => {
    await show();
    const group = screen.getByTestId('group-health-card');
    const rows = within(group)
      .getAllByRole('button')
      .map((row) => row.props.accessibilityLabel as string);
    expect(rows).toEqual([
      `${t('settings.health.consent')}, ${t('settings.consents.allowed')}`,
      `${t('settings.consents.APPLE_HEALTH')}, ${t('settings.consents.notAllowed')}`,
      t('settings.healthWrite.title'),
      t('settings.import.title'),
    ]);
    // Their controls are on the pages, not under the rows; and the workout import is a Training row, not here twice.
    expect(screen.queryByText(t('settings.healthWrite.workouts'))).toBeNull();
    await press(t('settings.import.title'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/settings-detail', params: { part: 'import' } });
  });

  test.each([
    ['consent', 'settings.health.consent'],
    ['apple', 'settings.consents.APPLE_HEALTH'],
    ['write', 'settings.healthWrite.title'],
    ['import', 'settings.import.title'],
  ])('the %s page is titled by its row and holds the controls Settings used to hold inline', async (part, titleKey) => {
    await showDetail(part);
    expect(screen.getByRole('header', { name: t(titleKey) })).toBeOnTheScreen();
  });

  test('the consent page keeps the consent text one tap away (View), the write page its switches and its note, the import page its weigh-ins', async () => {
    await showDetail('consent');
    await press(`${t('settings.consents.view')} ${t('settings.consents.HEALTH_DATA')}`);
    expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
    await screen.unmount();
    await showDetail('write');
    expect(screen.getByText(t('settings.healthWrite.note'))).toBeOnTheScreen();
    expect(screen.getByText(t('settings.healthWrite.workouts'))).toBeOnTheScreen();
    expect(screen.getByText(t('settings.healthWrite.weighIns'))).toBeOnTheScreen();
    expect(screen.getAllByRole('switch')).toHaveLength(2); // iOS switches, not Turn on / Turn off buttons (K-1062)
    await screen.unmount();
    await showDetail('import');
    expect(screen.getByText(t('settings.import.note'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('settings.import.importLabel', { what: t('settings.import.weighIns') }) })).toBeOnTheScreen();
  });
});

describe('reminders (ADR-036)', () => {
  test('one Switch row turns the three kinds on through the existing logic; the paragraph is not on Settings; no time picker, no weigh-in reminder', async () => {
    await show();
    const toggle = screen.getByRole('switch', { name: t('settings.reminders.title') });
    expect(toggle).toHaveProp('value', false);
    await fireEvent(toggle, 'valueChange', true);
    await act(async () => {});
    expect(mockServices.reminders.turnOn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/before your usual training time/)).toBeNull();
    expect(screen.queryByLabelText(t('settings.reminders.cue.label'))).toBeNull();
    expect(screen.queryByText(/\d\d:\d\d/)).toBeNull();
    expect(screen.queryByText(/monday call/i)).toBeNull();
    expect(screen.queryByText(/weigh-in reminder/i)).toBeNull();
    expect(screen.queryByRole('adjustable')).toBeNull();
  });

  test('Your routine opens its page: one line, sentences to tap, and the sentence kept', async () => {
    await show();
    await press(t('settings.reminders.routine'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'routine' } });
    await screen.unmount();
    await showDetail('routine');
    expect(screen.getByRole('header', { name: t('settings.reminders.routine') })).toBeOnTheScreen();
    expect(screen.getByText(t('settings.reminders.cue.hint'))).toBeOnTheScreen();
    expect(screen.queryByText(/before your usual training time/)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'After work');
    await press(t('settings.reminders.cue.saveLabel'));
    expect(mockServices.reminders.setCue).toHaveBeenCalledWith('After work');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('subscription', () => {
  test('what the server says, with its date, as the first row; the plan is not named (the contract does not carry it)', async () => {
    await show();
    expect(screen.getByText(t('settings.subscription.status.ACTIVE', { date: 'Oct 26, 2026' }))).toBeOnTheScreen();
    expect(screen.queryByText(/yearly|monthly|annual/i)).toBeNull();
  });
});

describe('data sources (ADR-088 #3)', () => {
  test('Food data names USDA and Open Food Facts on its row, and opens the page that credits them', async () => {
    await show();
    await press(`${t('settings.sources.food')}, ${t('settings.sources.foodValue')}`);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'sources' } });
  });

  test('the page credits both: USDA FoodData Central as public domain, Open Food Facts under the ODbL, each with its link', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await showDetail('sources');
    expect(screen.getByRole('header', { name: t('settings.sources.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('settings.sources.usda.name'))).toBeOnTheScreen();
    expect(screen.getByText(t('settings.sources.usda.note'))).toBeOnTheScreen();
    expect(screen.getByText(t('settings.sources.off.name'))).toBeOnTheScreen();
    expect(screen.getByText(t('settings.sources.off.note'))).toBeOnTheScreen();
    expect(t('settings.sources.off.note')).toMatch(/ODbL/);
    expect(t('settings.sources.usda.note')).toMatch(/public domain/i);
    // The links: each is a row that opens its address.
    const usda = within(screen.getByTestId('source-usda')).getByRole('button', { name: `${t('settings.sources.website')}, ${t('settings.sources.usda.site')}` });
    await fireEvent.press(usda);
    expect(open).toHaveBeenLastCalledWith(t('settings.sources.usda.url'));
    const off = within(screen.getByTestId('source-off'));
    await fireEvent.press(off.getByRole('button', { name: `${t('settings.sources.website')}, ${t('settings.sources.off.site')}` }));
    expect(open).toHaveBeenLastCalledWith(t('settings.sources.off.url'));
    await fireEvent.press(off.getByRole('button', { name: `${t('settings.sources.license')}, ${t('settings.sources.off.licenseName')}` }));
    expect(open).toHaveBeenLastCalledWith(t('settings.sources.off.licenseUrl'));
    for (const key of ['usda.url', 'off.url', 'off.licenseUrl']) expect(t(`settings.sources.${key}`)).toMatch(/^https:\/\//);
    open.mockRestore();
  });

  test('a link that cannot be opened says so', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    await showDetail('sources');
    await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(`^${t('settings.sources.website')},`) })[0]);
    await act(async () => {});
    expect(screen.getByText(t('settings.sources.failed'))).toBeOnTheScreen();
    open.mockRestore();
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
    expect(alert).toHaveBeenCalledWith(t('settings.delete.confirmTitle'), expect.any(String), expect.any(Array));
    expect(mockServices.deleteAccount).not.toHaveBeenCalled();
  });
});

describe('every row can be reached with a screen reader', () => {
  test('rows are buttons at least as tall as a touch target, named with their value', async () => {
    await show();
    const rows = [t('settings.training.days'), t('editProgram.cardio.title'), t('settings.training.import'), t('settings.food.avoid'), t('settings.profile.goal'), t('settings.profile.checkIn')];
    for (const name of rows) {
      const row = screen.getByRole('button', { name: new RegExp(`^${name},`) });
      const flat = [row.props.style].flat(Infinity) as ({ minHeight?: number } | undefined)[];
      expect(Math.max(...flat.map((s) => s?.minHeight ?? 0))).toBeGreaterThanOrEqual(44);
    }
  });
});
