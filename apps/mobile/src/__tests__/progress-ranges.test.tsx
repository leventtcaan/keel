/**
 * Longer chart ranges on Progress (K-1260, ADR-096 Ek 1): weight 12 weeks, 6 months and a year free, everything with a subscription;
 * strength the server's 3 months free, 6 months, a year and everything with one. A paid range asks only when chosen; without a
 * subscription the chart stays and the sand lock says why; unread is never a lock.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { LiftsCard } from '@/progress/LiftsCard';
import { rangeFrom } from '@/progress/longRange';
import { WeightCard } from '@/progress/WeightCard';
import { ThemeProvider } from '@/theme/theme';
import { localDay } from '@/today/today';
import { shortDate } from '@/train/program';

type Schemas = components['schemas'];

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockServices = {
  api: { GET: jest.fn() },
  paidAccess: jest.fn(async (): Promise<'open' | 'locked' | 'unread'> => 'locked'),
  training: { moveHistory: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockServices.paidAccess.mockImplementation(async () => 'locked');
  mockServices.api.GET.mockImplementation(async (_path: string, init: { params: { query: { from: string } } }) => ({
    data: [{ day: init.params.query.from, kg: 90 }, { day: localDay(new Date()), kg: 85 }],
    response: { status: 200 },
  }));
});

const today = () => localDay(new Date());
const word = async (label: string) => {
  await fireEvent.press(screen.getByRole('button', { name: label }));
  await act(async () => {});
};

describe('weight', () => {
  const part = { kind: 'chart' as const, points: [{ day: rangeFrom(today(), 84), kg: 88 }, { day: today(), kg: 85 }] };
  const show = () =>
    render(
      <ThemeProvider scheme="light">
        <WeightCard part={part} units="METRIC" />
      </ThemeProvider>,
    );

  test('12 weeks first, as Progress read it; 6 months is free: read from the server, the subscription not asked', async () => {
    await show();
    expect(screen.getByTestId('weight-change').props.children).toContain(shortDate(rangeFrom(today(), 84)));
    await word(t('progress.range.halfYear'));
    expect(mockServices.api.GET).toHaveBeenCalledWith('/v1/weight-trend', { params: { query: { from: rangeFrom(today(), 182), to: today() } } });
    expect(screen.getByTestId('weight-change').props.children).toContain(shortDate(rangeFrom(today(), 182)));
    expect(mockServices.paidAccess).not.toHaveBeenCalled();
  });

  test('a year is free too (the weigh-in screen already showed it)', async () => {
    await show();
    await word(t('progress.range.year'));
    expect(mockServices.api.GET).toHaveBeenCalledWith('/v1/weight-trend', { params: { query: { from: rangeFrom(today(), 365), to: today() } } });
    expect(mockServices.paidAccess).not.toHaveBeenCalled();
  });

  test('All without a subscription: the sand lock, the chart as it was, nothing read', async () => {
    await show();
    await word(t('progress.range.all'));
    expect(screen.getByText(t('progress.range.locked'))).toBeOnTheScreen();
    expect(screen.getByText(t('subscription.seePlans'))).toBeOnTheScreen();
    expect(screen.getByTestId('weight-change').props.children).toContain(shortDate(rangeFrom(today(), 84)));
    expect(mockServices.api.GET).not.toHaveBeenCalled();
  });

  test('All with a subscription: everything, read back window by window', async () => {
    mockServices.paidAccess.mockImplementation(async () => 'open');
    let windows = 0;
    mockServices.api.GET.mockImplementation(async () => ({ data: windows++ < 2 ? [{ day: `202${6 - windows}-01-05`, kg: 95 }] : [], response: { status: 200 } }));
    await show();
    await word(t('progress.range.all'));
    expect(mockServices.api.GET).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(t('progress.range.locked'))).toBeNull();
    expect(screen.getByTestId('weight-change').props.children).toContain(shortDate('2024-01-05'));
  });

  test('a subscription that cannot be read is no lock', async () => {
    mockServices.paidAccess.mockImplementation(async () => 'unread');
    await show();
    await word(t('progress.range.all'));
    expect(screen.getByText(t('progress.range.unread'))).toBeOnTheScreen();
    expect(screen.queryByText(t('progress.range.locked'))).toBeNull();
  });
});

describe('strength', () => {
  const weekAgo = (weeks: number) => rangeFrom(today(), 7 * weeks + 1);
  const lift: Schemas['LiftProgress'] = {
    exerciseId: 'squat',
    baseline: { loadKg: 80, reps: 5, day: weekAgo(10) },
    best: { loadKg: 100, reps: 5, day: weekAgo(1) },
    stronger: true,
    weeks: [
      { weekOf: weekAgo(10), loadKg: 80, reps: 5, held: false },
      { weekOf: weekAgo(1), loadKg: 100, reps: 5, held: true },
    ],
  } as Schemas['LiftProgress'];
  const show = () =>
    render(
      <ThemeProvider scheme="light">
        <LiftsCard lifts={[lift]} moves={new Map()} units="METRIC" />
      </ThemeProvider>,
    );

  test('6 months without a subscription: the sand lock, the history not read', async () => {
    await show();
    await word(t('progress.range.halfYear'));
    expect(screen.getByText(t('progress.range.locked'))).toBeOnTheScreen();
    expect(mockServices.training.moveHistory).not.toHaveBeenCalled();
  });

  test("6 months with a subscription: the lift's history pages give the older weeks; the server's weeks stay", async () => {
    mockServices.paidAccess.mockImplementation(async () => 'open');
    const old = new Date(Date.parse(`${weekAgo(20)}T12:00:00`)).toISOString();
    mockServices.training.moveHistory.mockImplementation(async (_api: unknown, _move: string, before?: string) => ({
      read: {
        state: 'ready',
        value:
          before === undefined
            ? { sessions: [{ id: 'a', clientId: 'a', startedAt: old, sets: [{ id: 's', clientId: 's', exerciseId: 'squat', setType: 'WORKING', loadKg: 70, reps: 8 }] }], records: [] }
            : { sessions: [], records: [] },
      },
      kept: false,
    }));
    await show();
    await word(t('progress.range.halfYear'));
    expect(mockServices.training.moveHistory).toHaveBeenCalledWith(mockServices.api, 'squat', undefined);
    expect(screen.queryByText(t('progress.range.locked'))).toBeNull();
    expect(screen.getByLabelText(/70 kg in the week of/)).toBeOnTheScreen();
  });
});
