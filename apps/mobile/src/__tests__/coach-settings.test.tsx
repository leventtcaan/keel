/**
 * Settings › Coach and AI (ADR-092 #3, #5): the AI consent the coach is given to — its provider and data named by the server, its
 * text the consent text — what the coach was asked to remember, each with Forget, and the conversation, which can be cleared.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { CoachGroup } from '@/settings/CoachGroup';
import { CoachSettings } from '@/settings/CoachSettings';
import { consentVersion } from '@/consent/consents';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const empty = (status: number): Answer => ({ response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const OFFER: Schemas['AiConsentOffer'] = { provider: 'OpenAI', dataTypes: ['coach question', 'meal note', 'meal photo'] };
const consentList = (status: 'GRANTED' | 'NEVER_ASKED') => [
  { kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: '5' },
  { kind: 'APPLE_HEALTH', status: 'NEVER_ASKED' },
  status === 'GRANTED'
    ? { kind: 'THIRD_PARTY_AI', status, textVersion: consentVersion('THIRD_PARTY_AI'), provider: 'OpenAI', dataTypes: OFFER.dataTypes }
    : { kind: 'THIRD_PARTY_AI', status },
];

let mockGet: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockGet[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockPut: Answer | 'offline' = ok({});
const mockPUT = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPut === 'offline') throw new TypeError('Network request failed');
  return mockPut;
});
let mockDelete: Answer | 'offline' = empty(204);
const mockDELETE = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockDelete === 'offline') throw new TypeError('Network request failed');
  return mockDelete;
});
const mockRemember = jest.fn(async (_kind: string, _status: string) => {});
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => {} },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
const mockServices = { api: { GET: mockGET, PUT: mockPUT, DELETE: mockDELETE }, report: jest.fn(), consents: { remember: mockRemember } };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGet = {
    '/v1/consents': ok(consentList('NEVER_ASKED')),
    '/v1/consents/ai-offer': ok(OFFER),
    '/v1/coach/memory': ok({ items: [{ id: 'm1', text: 'I train early in the morning', createdAt: '2026-11-20T08:00:00Z' }], maxItems: 10 }),
  };
  mockPut = ok({});
  mockDelete = empty(204);
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CoachSettings />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
};

test('Settings has one row for the coach, which opens its page', async () => {
  await render(
    <ThemeProvider scheme="light">
      <CoachGroup />
    </ThemeProvider>,
  );
  await press(t('settings.coach.row'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'coach' } });
});

test('the consent text names the provider the server offers; allowing grants exactly that provider and data, to the text shown', async () => {
  await show();
  expect(screen.getByText(t('consent.third_party_ai.body', { provider: 'OpenAI' }))).toBeOnTheScreen();
  await press(t('settings.coach.allow'));
  expect(mockPUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
    params: { path: { kind: 'THIRD_PARTY_AI' } },
    body: { textVersion: consentVersion('THIRD_PARTY_AI'), provider: 'OpenAI', dataTypes: OFFER.dataTypes },
  });
  expect(mockRemember).toHaveBeenCalledWith('THIRD_PARTY_AI', 'GRANTED');
});

test('while the server has no AI provider the page says so and offers no Allow', async () => {
  mockGet['/v1/consents/ai-offer'] = refused(404, 'NOT_FOUND');
  await show();
  expect(screen.getByText(t('settings.coach.unavailable'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('settings.coach.allow') })).toBeNull();
});

test('given, it can be withdrawn; the phone is told at once', async () => {
  mockGet['/v1/consents'] = ok(consentList('GRANTED'));
  mockDelete = ok({ kind: 'THIRD_PARTY_AI', status: 'WITHDRAWN' });
  await show();
  expect(screen.queryByRole('button', { name: t('settings.coach.allow') })).toBeNull();
  await press(t('settings.coach.withdraw'));
  expect(mockDELETE).toHaveBeenCalledWith('/v1/consents/{kind}', { params: { path: { kind: 'THIRD_PARTY_AI' } } });
  expect(mockRemember).toHaveBeenCalledWith('THIRD_PARTY_AI', 'WITHDRAWN');
});

test('what the coach remembers is listed, each with Forget; forgotten, it is deleted on the server and the list is read again', async () => {
  await show();
  expect(screen.getByText('I train early in the morning')).toBeOnTheScreen();
  mockGet['/v1/coach/memory'] = ok({ items: [], maxItems: 10 });
  await press(`${t('settings.coach.forget')}: I train early in the morning`);
  expect(mockDELETE).toHaveBeenCalledWith('/v1/coach/memory/{id}', { params: { path: { id: 'm1' } } });
  expect(screen.getByText(t('settings.coach.forgot'))).toBeOnTheScreen();
  expect(screen.getByText(t('settings.coach.memoryNone'))).toBeOnTheScreen();
});

test('the conversation can be cleared: deleted on the server, and said', async () => {
  await show();
  await press(t('settings.coach.clear'));
  expect(mockDELETE).toHaveBeenCalledWith('/v1/coach/history');
  expect(screen.getByText(t('settings.coach.cleared'))).toBeOnTheScreen();
});

test.each([
  ['no connection', 'offline' as const, 'settings.coach.failed'],
  ['refused by the server', refused(500, 'INTERNAL'), 'settings.serverError'],
])('a change that did not go through (%s) says so and changes nothing shown', async (_name, answer, words) => {
  await show();
  mockDelete = answer;
  await press(t('settings.coach.clear'));
  expect(screen.getByText(t(words))).toBeOnTheScreen();
  expect(screen.queryByText(t('settings.coach.cleared'))).toBeNull();
});
