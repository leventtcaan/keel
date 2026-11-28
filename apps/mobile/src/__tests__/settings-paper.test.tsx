/**
 * Settings' rows on the paper (K-1258, ADR-094 Ek 9 › Uygulama #3): on a chapter's page and the pages under it there is no sand
 * card and no system icon, only hairlines (a list elsewhere keeps its card); a choice of a few is words, the chosen one petrol
 * with a petrol underline (no black segment); while the reminders are off their two other switches are not there, one line says
 * what turning them on brings; Delete account is the warning colour as words, apart from the other two.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useSyncExternalStore as mockUseSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

import { createApiClient } from '@/api/client';
import { ListGroup, ListRow } from '@/components/ListGroup';
import type { components } from '@/api/schema';
import SettingsSectionScreen from '@/app/settings-section';
import { t } from '@/copy';
import { SECTIONS } from '@/settings/sections';
import { storeUnavailable } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { name: string; testID?: string }) => createElement('SymbolView', { ...props, testID: props.testID ?? `symbol-${props.name}` }) };
});

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    mockFocusEffects.add(effect);
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]);
  },
}));
/** The screen's focus reads: called again as when the screen comes back into view from a page pushed over it. */
const mockFocusEffects = new Set<() => void>();

const day = (id: string, weekday?: Schemas['Weekday']): Schemas['ProgramDay'] => ({ id, nameKey: 'full_body_a', ...(weekday ? { weekday } : {}), exercises: [] });
const PROGRAM: Schemas['Program'] = {
  id: '11111111-1111-4111-8111-111111111111',
  source: 'GENERATED',
  days: [day('d1', 'MONDAY'), day('d2', 'WEDNESDAY'), day('d3', 'FRIDAY')],
  cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false },
} as Schemas['Program'];
const PROFILE: Schemas['Profile'] = {
  goal: 'LOSE_FAT',
  sex: 'MALE',
  heightCm: 180,
  birthYear: 1994,
  activityLevel: 'LOW_ACTIVE',
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['TUESDAY', 'THURSDAY'], checkInDay: 'WEDNESDAY', timeZone: 'Europe/Istanbul' },
  food: { avoid: [], budgetNote: 'kept' },
  units: 'METRIC',
};
const SUBSCRIPTION: Schemas['Subscription'] = { active: true, appUserId: '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b', status: 'TRIAL', accessUntil: '2026-12-12T12:00:00Z' };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const api = createApiClient({
  baseUrl: 'https://api.example.test',
  accessToken: async () => 'tok',
  fetch: async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (path === '/v1/program') return json(PROGRAM);
    if (path === '/v1/subscription') return json(SUBSCRIPTION);
    if (path === '/v1/profile') return json(PROFILE);
    if (path === '/v1/consents') return json([{ kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: t('consent.health_data.version') }]);
    return json({ code: 'NOT_FOUND' }, 404);
  },
});

let mockReminders: { enabled: boolean; cue: string } = { enabled: false, cue: '' };
let mockPermission = { granted: false, canAskAgain: true };
const mockNoWalks: never[] = [];
const mockServices = {
  walks: { current: () => mockNoWalks, subscribe: () => () => {} },
  api,
  units: { set: jest.fn(async () => 'profile' as const) },
  appearance: { current: () => 'light', subscribe: () => () => {}, set: jest.fn(async () => {}) },
  language: { set: jest.fn(async () => {}) },
  health: { available: true, requestRead: jest.fn(async () => {}) },
  importHealthWeights: jest.fn(async () => 0),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  signOut: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  purchases: storeUnavailable,
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(), forget: async () => {} },
  consents: { remember: jest.fn(async () => {}), granted: jest.fn(async () => true) },
  withdrawHealthData: jest.fn(async () => {}),
  report: jest.fn(),
  reminders: {
    current: () => mockReminders,
    subscribe: () => () => {},
    permission: jest.fn(async () => mockPermission),
    turnOn: jest.fn(async () => ({ granted: true, canAskAgain: false })),
    turnOff: jest.fn(async () => {}),
    setCue: jest.fn(async () => {}),
    keepSchedule: jest.fn(async () => {}),
  },
  healthWriting: { current: () => ({ workouts: false, weighIns: false }), subscribe: () => () => {}, shown: () => 'off', turnOn: jest.fn(async () => true), turnOff: jest.fn(async () => {}) },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
  useAppearance: () => mockUseSyncExternalStore(mockServices.appearance.subscribe, mockServices.appearance.current),
  useLanguage: () => 'system',
  useRestChoice: () => ({ mode: 'RECOMMENDED', custom: { COMPOUND: 120, ISOLATION: 120 } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusEffects.clear();
  mockReminders = { enabled: false, cue: '' };
  mockPermission = { granted: false, canAskAgain: true };
});

async function show(element: React.ReactElement) {
  await render(<ThemeProvider appearance="light">{element}</ThemeProvider>);
  await act(async () => {});
}
async function showSection(section: string) {
  mockParams = { section };
  await show(<SettingsSectionScreen />);
}

/** Every background colour drawn in the tree, buttons left out. */
function cardGrounds(): string[] {
  const found: string[] = [];
  const walk = (node: ReturnType<typeof screen.toJSON>) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.props.accessibilityRole === 'button') return;
    const style = StyleSheet.flatten(node.props.style as never) as { backgroundColor?: string } | undefined;
    if (style?.backgroundColor !== undefined) found.push(style.backgroundColor);
    (node.children ?? []).forEach((child) => walk(child as never));
  };
  walk(screen.toJSON());
  return found;
}

/** Every background colour drawn in the tree. */
function grounds(): string[] {
  const found: string[] = [];
  const walk = (node: ReturnType<typeof screen.toJSON>) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const style = StyleSheet.flatten(node.props.style as never) as { backgroundColor?: string } | undefined;
    if (style?.backgroundColor !== undefined) found.push(style.backgroundColor);
    (node.children ?? []).forEach((child) => walk(child as never));
  };
  walk(screen.toJSON());
  return found;
}

const ICONS_ALLOWED = ['chevron.right', 'arrow.up.right'];
const icons = () => screen.queryAllByTestId(/^symbol-/).map((s) => s.props.name as string);

describe('the rows on the paper', () => {
  test.each(SECTIONS)('the %s page has no sand card and no icon but a chevron or a link arrow', async (section) => {
    await showSection(section);
    // A secondary button is a sand pill by its role (ADR-094 §3); a sand card is what is gone.
    expect(cardGrounds()).not.toContain(palettes.light.surface);
    expect(icons().filter((name) => !ICONS_ALLOWED.includes(name))).toEqual([]);
  });

  test('a list on another screen keeps its card and its icons', async () => {
    await show(
      <ListGroup testID="elsewhere">
        <ListRow icon="star" label="Row" />
      </ListGroup>,
    );
    expect(screen.getByTestId('elsewhere-card')).toHaveStyle({ backgroundColor: palettes.light.surface });
    expect(icons()).toEqual(['star']);
  });
});

describe('a choice of a few, as words', () => {
  test('the chosen word is petrol over a petrol line, the others plain; a screen reader hears it selected', async () => {
    await showSection('app');
    const light = screen.getByRole('button', { name: t('settings.appearance.light') });
    const dark = screen.getByRole('button', { name: t('settings.appearance.dark') });
    expect(light).toBeSelected();
    expect(dark).not.toBeSelected();
    expect(light).toHaveStyle({ borderBottomColor: palettes.light.accent });
    expect(within(light).getByText(t('settings.appearance.light'))).toHaveStyle({ color: palettes.light.accent });
    expect(within(dark).getByText(t('settings.appearance.dark'))).toHaveStyle({ color: palettes.light.muted });
    expect(grounds()).not.toContain(palettes.light.text);
    await fireEvent.press(dark);
    expect(mockServices.appearance.set).toHaveBeenCalledWith('dark');
  });

  test('the units read short ("kg, cm"), and a screen reader hears the whole name', async () => {
    await showSection('app');
    const metric = screen.getByRole('button', { name: t('settings.units.metric') });
    expect(within(metric).getByText(t('settings.units.metricShort'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('settings.units.imperial') })).toBeTruthy();
    expect(screen.queryByText(t('settings.units.imperial'))).toBeNull();
  });
});

describe('the reminders, turned off', () => {
  test('the meal and the walk switches are not there; one line says what turning them on brings', async () => {
    await showSection('reminders');
    const switches = screen.queryAllByRole('switch').map((s) => s.props.accessibilityLabel);
    expect(switches).toEqual([t('settings.reminders.title')]);
    expect(screen.getByText(t('settings.reminders.offLine'))).toBeTruthy();
    expect(screen.queryByText(t('settings.reminders.kinds'))).toBeNull();
  });

  test('turned on, the two switches are back and the line names the kinds', async () => {
    mockReminders = { enabled: true, cue: '' };
    mockPermission = { granted: true, canAskAgain: false };
    await showSection('reminders');
    const switches = screen.queryAllByRole('switch').map((s) => s.props.accessibilityLabel);
    expect(switches).toEqual([t('settings.reminders.title'), t('settings.reminders.meals'), t('settings.reminders.walk')]);
    expect(screen.getByText(t('settings.reminders.kinds'))).toBeTruthy();
  });
});

describe('the account', () => {
  test('Delete account is the warning colour as words, apart from Export and Sign out', async () => {
    await showSection('account');
    const remove = screen.getByRole('button', { name: t('settings.delete.title') });
    expect(within(remove).getByText(t('settings.delete.title'))).toHaveStyle({ color: palettes.light.warn });
    const group = screen.getByTestId('group-account-card');
    expect(within(group).queryByText(t('settings.delete.title'))).toBeNull();
    expect(within(group).getByText(t('settings.export.title'))).toBeTruthy();
    expect(within(group).getByText(t('settings.signOut.title'))).toBeTruthy();
  });
});
