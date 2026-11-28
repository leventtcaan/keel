/**
 * Settings as contents (K-1257, ADR-094 Ek 9): one screen of nine chapters, each with what it holds today and a page of its
 * own (`settings-section`). Your week and You open with the one sage group "Your call reads these", which holds only what the
 * weekly call reads (training days, the check-in day, goal, height, activity, birth year; not the cardio, the rest or the
 * foods). Every row Settings had is still on one of the pages.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useSyncExternalStore as mockUseSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import SettingsScreen from '@/app/settings';
import SettingsSectionScreen from '@/app/settings-section';
import { t } from '@/copy';
import { previousScreenName } from '@/navigation/pushed';
import { SECTIONS } from '@/settings/sections';
import { SettingsSection } from '@/settings/SettingsSection';
import { activityName, dayName, goalName } from '@/settings/profileWords';
import { stateWords } from '@/settings/SubscriptionSection';
import { storeUnavailable } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';
import { cardioLine, daysLine } from '@/train/programLines';

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
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

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

const TITLES = {
  week: t('settings.section.week'),
  you: t('settings.section.you'),
  reminders: t('settings.reminders.title'),
  health: t('settings.health.title'),
  coach: t('settings.coach.title'),
  subscription: t('settings.subscription.title'),
  app: t('settings.section.app'),
  about: t('settings.section.about'),
  account: t('settings.account.title'),
} as const;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chapter = (id: keyof typeof TITLES) => screen.getByRole('button', { name: new RegExp(`^${escape(TITLES[id])}(,|$)`) });

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

describe('the contents page', () => {
  test('nine chapters, in this order, each a button that opens its page', async () => {
    await show(<SettingsScreen />);
    expect(SECTIONS).toEqual(['week', 'you', 'reminders', 'health', 'coach', 'subscription', 'app', 'about', 'account']);
    const names = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string);
    const order = SECTIONS.map((id) => names.findIndex((name) => new RegExp(`^${escape(TITLES[id])}(,|$)`).test(name)));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await fireEvent.press(chapter('week'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-section', params: { section: 'week' } });
  });

  test('each chapter says what it holds today', async () => {
    mockReminders = { enabled: true, cue: '' };
    mockPermission = { granted: true, canAskAgain: false };
    await show(<SettingsScreen />);
    const said = (id: keyof typeof TITLES) => chapter(id).props.accessibilityLabel as string;
    expect(said('week')).toBe(`${TITLES.week}, ${daysLine(PROGRAM)}, ${t('settings.section.checkIn', { day: dayName('WEDNESDAY') })}, ${cardioLine(PROGRAM)}`);
    expect(said('you')).toBe(`${TITLES.you}, ${goalName('LOSE_FAT')}, 180 cm, 1994`);
    expect(said('reminders')).toBe(`${TITLES.reminders}, ${t('settings.section.on')}`);
    expect(said('health')).toBe(`${TITLES.health}, ${t('settings.section.healthLine')}`);
    expect(said('coach')).toBe(`${TITLES.coach}, ${t('settings.section.coachLine')}`);
    expect(said('subscription')).toBe(`${TITLES.subscription}, ${stateWords(SUBSCRIPTION)}`);
    expect(said('app')).toBe(`${TITLES.app}, ${t('settings.appearance.light')}, ${t('settings.language.system')}, ${t('settings.units.metricShort')}`);
    expect(said('about')).toBe(`${TITLES.about}, ${t('settings.section.aboutLine')}`);
    expect(said('account')).toBe(`${TITLES.account}, ${t('settings.section.accountLine')}`);
  });

  test('reminders turned on that iOS does not allow are said as off', async () => {
    mockReminders = { enabled: true, cue: '' };
    await show(<SettingsScreen />);
    expect(chapter('reminders').props.accessibilityLabel).toBe(`${TITLES.reminders}, ${t('settings.section.off')}`);
  });

  test('the chapters sit on the paper: no sand card, no sage group, no icon but the chevron', async () => {
    await show(<SettingsScreen />);
    expect(grounds()).not.toContain(palettes.light.surface);
    expect(grounds()).not.toContain(palettes.light.tintTime);
    expect(screen.queryAllByTestId(/^symbol-/).map((s) => s.props.name)).toEqual(SECTIONS.map(() => 'chevron.right'));
  });
});

describe('a chapter page', () => {
  test('its title is the chapter, and a page opened from it names it on the way back', async () => {
    await showSection('week');
    expect(screen.getByRole('header', { name: TITLES.week })).toBeTruthy();
    const state = { routes: [{ key: 's', name: 'settings-section', params: { section: 'week' } }, { key: 'd', name: 'settings-detail' }] };
    expect(previousScreenName(state, 'd')).toBe(TITLES.week);
    expect(previousScreenName({ routes: [{ key: 'a', name: 'settings' }, { key: 'b', name: 'settings-section' }] }, 'b')).toBe(t('settings.title'));
  });

  test('Your week: the call reads the training days and the check-in day; the cardio, the rest and the import are under it', async () => {
    await showSection('week');
    const reads = screen.getByTestId('decision-reads');
    expect(within(reads).getByRole('header', { name: t('settings.section.reads') })).toBeTruthy();
    expect(within(reads).getByRole('button', { name: `${t('settings.training.days')}, ${daysLine(PROGRAM)}` })).toBeTruthy();
    expect(within(reads).getByRole('button', { name: `${t('settings.profile.checkIn')}, ${dayName('WEDNESDAY')}` })).toBeTruthy();
    expect(within(reads).queryByRole('button', { name: new RegExp(`^${escape(t('editProgram.cardio.title'))}`) })).toBeNull();
    expect(screen.getByRole('button', { name: `${t('editProgram.cardio.title')}, ${cardioLine(PROGRAM)}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`^${escape(t('settings.rest.title'))},`) })).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`^${escape(t('settings.training.import'))},`) })).toBeTruthy();
    // The week's training days, each marked: Monday, Wednesday and Friday trained, the rest not.
    const days = within(reads).getAllByTestId(/^week-day-/);
    expect(days.map((d) => d.props.accessibilityLabel)).toEqual(
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => t(`programEditor.weekdayShort.${d}`)),
    );
    expect(days.map((d) => d.props.accessibilityState?.selected)).toEqual([true, false, true, false, true, false, false]);
    expect(StyleSheet.flatten(reads.props.style).backgroundColor).toBe(palettes.light.tintTime);
  });

  test('You: the call reads the goal, the height, the activity and the year of birth; the foods you avoid are under it', async () => {
    await showSection('you');
    const reads = screen.getByTestId('decision-reads');
    for (const name of [
      `${t('settings.profile.goal')}, ${goalName('LOSE_FAT')}`,
      `${t('settings.profile.height')}, 180 cm`,
      `${t('settings.profile.activity')}, ${activityName('LOW_ACTIVE')}`,
      `${t('settings.profile.born')}, 1994`,
    ]) {
      expect(within(reads).getByRole('button', { name })).toBeTruthy();
    }
    expect(within(reads).queryByRole('button', { name: new RegExp(`^${escape(t('settings.food.avoid'))}`) })).toBeNull();
    expect(screen.getByRole('button', { name: new RegExp(`^${escape(t('settings.food.avoid'))},`) })).toBeTruthy();
  });

  test('every row Settings had is on one of the pages', async () => {
    const seen = new Set<string>();
    await show(
      <>
        {SECTIONS.map((section) => (
          <SettingsSection key={section} section={section} granted />
        ))}
      </>,
    );
    screen.queryAllByRole('button').forEach((b) => seen.add(String(b.props.accessibilityLabel)));
    screen.queryAllByRole('switch').forEach((s) => seen.add(String(s.props.accessibilityLabel)));
    const has = (label: string) => [...seen].some((name) => name === label || name.startsWith(`${label},`));
    for (const key of [
      'settings.appearance.light',
      'settings.language.system',
      'settings.units.metric',
      'settings.training.days',
      'editProgram.cardio.title',
      'settings.rest.title',
      'settings.training.import',
      'settings.food.avoid',
      'settings.profile.goal',
      'settings.profile.checkIn',
      'settings.profile.height',
      'settings.profile.activity',
      'settings.profile.born',
      'settings.reminders.title',
      'settings.reminders.routine',
      'settings.reminders.meals',
      'settings.reminders.walk',
      'settings.health.consent',
      'settings.consents.APPLE_HEALTH',
      'settings.healthWrite.title',
      'settings.import.title',
      'settings.sources.food',
      'settings.guide.row',
      'settings.export.title',
      'settings.signOut.title',
      'settings.delete.title',
    ]) {
      expect([key, has(t(key))]).toEqual([key, true]);
    }
  });
});
