/**
 * Flow test D (prototip/akis-testi.md: "Dönüş seçimi; duraklat; ayarlarda tema değişir"; K-981). Walked through the real
 * screens with a server that keeps what it is told: three weeks away, the app asks (GET /v1/return says so), Ease back in is
 * answered and the screen is left; the same person then says Traveling for three days (no consent asked: it is not health
 * data) and switches to Dark in Settings. Each step checks where the app went and what the server was told, as the
 * prototype's test checks the screen id. The last part of the prototype's D (a move picked in Progress) is K-979's.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { components } from '@/api/schema';
import ReturnScreen from '@/app/return';
import StateScreen from '@/app/state';
import { t } from '@/copy';
import { AppearanceSection } from '@/settings/AppearanceSection';
import type { Appearance } from '@/theme/appearance';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];

// The server: asks until it is answered once.
let summary: Schemas['ReturnSummary'];
const told: { method: string; path: string; body?: unknown }[] = [];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const mockApi = {
  GET: async (path: string) => (path === '/v1/return' ? ok(summary) : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) }),
  POST: async (path: string, init: { body: { choice: string } }) => {
    told.push({ method: 'POST', path, body: init.body });
    summary = { ...summary, shouldPrompt: false };
    return ok(summary);
  },
};
let mockAppearance: Appearance = 'light';
const mockServices = {
  api: mockApi,
  training: {
    read: async () => ({
      program: {
        state: 'ready',
        value: {
          id: 'p',
          source: 'GENERATED',
          backAfterBreak: true,
          days: [{ id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'MONDAY', exercises: [{ exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 95 }] }],
        },
      },
      exercises: { state: 'ready', value: [{ id: 'squat', nameKey: 'exercises.squat.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }] },
      kept: false,
    }),
  },
  state: {
    declare: jest.fn(async (kind: string, days?: number) => {
      told.push({ method: 'PUT', path: '/v1/state', body: { kind, days } });
      return { kind, since: '2027-01-04' };
    }),
  },
  consents: { granted: jest.fn(async () => false), remember: jest.fn() }, // no health data consent: Traveling needs none
  appearance: { current: () => mockAppearance, subscribe: () => () => {}, set: jest.fn(async (next: Appearance) => void (mockAppearance = next)) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
  useAppearance: () => mockAppearance,
}));

const mockWent: unknown[] = [];
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockWent.push(to), replace: (to: unknown) => mockWent.push(to), back: () => mockWent.push('back') },
}));

jest.setTimeout(30000);
beforeAll(() => jest.useFakeTimers({ now: new Date(2027, 0, 4, 9, 0), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout'] }));
afterAll(() => jest.useRealTimers());

let shown: Awaited<ReturnType<typeof render>> | null = null;
let mounts = 0;
const open = async (element: ReactElement) => {
  mounts += 1;
  const tree = <ThemeProvider key={mounts}>{element}</ThemeProvider>;
  if (shown === null) shown = await render(tree);
  else await shown.rerender(tree);
  await act(async () => {});
};
const last = () => mockWent[mockWent.length - 1];

test('D: three weeks away → Ease back in answered → Traveling for 3 days, no consent in the way → Dark in Settings', async () => {
  summary = { awayDays: 22, shouldPrompt: true, suggested: 'EASE_BACK', nextCallOn: '2027-01-25' };

  // Return: three options, Ease back in suggested and chosen; Next call from the server.
  await open(<ReturnScreen />);
  expect(screen.getByRole('header', { name: t('return.title') })).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: new RegExp(`^${t('return.ease.title')}`) }).props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByText(t('return.nextCall', { date: 'Mon, Jan 25' }))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('return.continue') }));
  await act(async () => {});
  expect(told).toEqual([{ method: 'POST', path: '/v1/return', body: { choice: 'EASE_BACK' } }]);
  expect(last()).toBe('back');

  // The server does not ask again for this gap.
  await open(<ReturnScreen />);
  expect(screen.queryByRole('radio')).toBeNull();
  expect(last()).toBe('back');

  // Life got in the way: Traveling, 3 days.
  await open(<StateScreen />);
  await fireEvent.press(screen.getByRole('radio', { name: t('state.tile.traveling') }));
  await fireEvent.press(screen.getByRole('button', { name: t('state.screen.forDays', { days: 3 }) }));
  await fireEvent.press(screen.getByRole('button', { name: t('state.screen.pause') }));
  await act(async () => {});
  expect(told[told.length - 1]).toEqual({ method: 'PUT', path: '/v1/state', body: { kind: 'TRAVELING', days: 3 } });
  expect(screen.queryByText(t('consent.health_data.title'))).toBeNull();
  expect(last()).toBe('back');

  // Settings › Appearance › Dark.
  await open(<AppearanceSection />);
  await fireEvent.press(screen.getByRole('button', { name: t('settings.appearance.dark') }));
  await act(async () => {});
  expect(mockServices.appearance.set).toHaveBeenCalledWith('dark');
  expect(mockAppearance).toBe('dark');
});
