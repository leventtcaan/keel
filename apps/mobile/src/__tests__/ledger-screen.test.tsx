/**
 * The call ledger screen (K-611, L3 Y4): every call newest first with what came after it, older pages on request, and the
 * way to each call's "Why this call". Read from the server only; "after", never "because".
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import LedgerScreen from '@/app/ledger';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { formatWeight } from '@/units/units';

type Decision = components['schemas']['Decision'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const call = (id: string, madeOn: string, readTrendKg?: number): Decision => ({
  id,
  madeOn,
  action: { type: 'CONTINUE' } as Decision['action'],
  reasons: [{ rule: 'toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-10-12',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
  declinable: false,
  changes: [],
  ...(readTrendKg === undefined ? {} : { readTrendKg }),
});

let mockPages: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (_path: string, init?: { params?: { query?: { before?: string } } }) => {
  const answer = mockPages[init?.params?.query?.before ?? 'first'] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) } }));
const mockServices = { api: { GET: mockGET }, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockPages = { first: ok({ items: [call('c2', '2026-10-05', 80.4), call('c1', '2026-09-28', 81.0)], next: 'c1' }), c1: ok({ items: [call('c0', '2026-09-21', 81.6)] }) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <LedgerScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('the calls newest first, each with what came after it; older ones on request, joined in time', async () => {
  await show();
  expect(screen.getAllByText(t('decision.continue.toward_goal.title'))).toHaveLength(2);
  expect(screen.getByText(t('ledger.after', { from: formatWeight(81.0, 'METRIC'), to: formatWeight(80.4, 'METRIC'), date: 'Mon, Oct 5' }))).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByText(t('ledger.more')));
  });

  expect(mockGET).toHaveBeenLastCalledWith('/v1/decisions', { params: { query: { before: 'c1' } } });
  // The oldest call's "after" is the call after it on the page before: the pages read as one list.
  expect(screen.getByText(t('ledger.after', { from: formatWeight(81.6, 'METRIC'), to: formatWeight(81.0, 'METRIC'), date: 'Mon, Sep 28' }))).toBeOnTheScreen();
  expect(screen.queryByText(t('ledger.more'))).toBeNull();
});

test('a call opens its "Why this call"', async () => {
  await show();
  fireEvent.press(screen.getAllByText(t('decision.continue.toward_goal.title'))[0]!);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/why', params: { id: 'c2' } });
});

test('no calls yet, no consent, or not read: one line each', async () => {
  mockPages = { first: ok({ items: [] }) };
  await show();
  expect(screen.getByText(t('ledger.none'))).toBeOnTheScreen();

  mockPages = { first: refused(403, 'CONSENT_REQUIRED') };
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();

  mockPages = { first: 'offline' };
  await show();
  expect(screen.getByText(t('ledger.failed'))).toBeOnTheScreen();
});

test('older calls not read: the ones shown stay, and it says so (K-611 review)', async () => {
  mockPages = { ...mockPages, c1: 'offline' };
  await show();
  await act(async () => {
    fireEvent.press(screen.getByText(t('ledger.more')));
  });
  expect(screen.getAllByText(t('decision.continue.toward_goal.title'))).toHaveLength(2);
  expect(screen.getByText(t('ledger.failed'))).toBeOnTheScreen();
  expect(screen.getByText(t('ledger.more'))).toBeOnTheScreen();

  mockPages = { ...mockPages, c1: refused(403, 'CONSENT_REQUIRED') };
  await act(async () => {
    fireEvent.press(screen.getByText(t('ledger.more')));
  });
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
});
