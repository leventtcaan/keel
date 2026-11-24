/**
 * Where calls are listed (Progress › Calls, the ledger), a call not unlocked (ADR-091 Ek 1, K-1202) is its day and that it is
 * ready: no title, no change, and it opens the call screen's locked view (Progress) or the plans (the ledger).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import LedgerScreen from '@/app/ledger';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { CallsCard } from '@/progress/CallsCard';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
const LOCKED: Schemas['LockedDecision'] = { id: 'l1', madeOn: '2026-12-21', weekOf: '2026-12-21', nextCallOn: '2026-12-28', locked: true };
const FULL: Schemas['Decision'] = {
  id: 'f1',
  madeOn: '2026-12-14',
  action: { type: 'CONTINUE' },
  reasons: [{ rule: 'toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-12-28',
  nextCallOn: '2026-12-21',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
  declinable: false,
  changes: [],
};

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() } }));
const mockGET = jest.fn(async (_path: string, _init?: unknown) => ({ data: { items: [LOCKED, FULL] }, response: new Response(null, { status: 200 }) }));
const mockServices = { api: { GET: mockGET }, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
beforeEach(() => jest.clearAllMocks());

test('Progress › Calls: a locked row is its date and "ready", and opens that call', async () => {
  await render(
    <ThemeProvider scheme="light">
      <CallsCard items={[LOCKED, FULL]} units="METRIC" />
    </ThemeProvider>,
  );
  expect(screen.getByText(t('lockedCall.ledger'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.continue.toward_goal.title'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('call-l1'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/call', params: { id: 'l1', from: 'progress' } });
});

test('the ledger: a locked call is its day, with the way to the plans, and no "why"', async () => {
  await render(
    <ThemeProvider scheme="light">
      <LedgerScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  const row = screen.getByTestId('locked-l1');
  expect(row).toBeOnTheScreen();
  expect(screen.getByText(t('lockedCall.ledger'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('subscription.seePlans') }));
  expect(mockPush).toHaveBeenCalledWith('/paywall');
});
