/**
 * The four numbers on This week (K-1206): food left, protein against its target, steps against theirs, the weight's trend.
 * Every figure is the server's or Apple Health's; the trend only once the server says it is ready (U1, U8); a part that is
 * not there says so in the words of Progress, never as a zero.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { TodayBlock } from '@/today/TodayBlock';
import { type WeightRead, proteinNumber, stepsNumber, weightNumber } from '@/today/numbers';
import type { Loaded } from '@/today/today';
import { formatWeight } from '@/units/units';

type Schemas = components['schemas'];

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: (...args: unknown[]) => mockNavigate(...args) },
}));
const mockReport = jest.fn();
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => ({ report: mockReport }) }));

const ready = <T,>(value: T): Loaded<T> => ({ state: 'ready', value });
const BUDGET: Schemas['DayBudget'] = {
  day: '2026-12-25',
  targetKcal: 2300,
  targetProteinG: 140,
  eaten: { kcal: { low: 900, high: 1100 }, proteinG: { low: 60, high: 80 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
  left: { kcal: { low: 1240, high: 1480 }, proteinG: { low: 60, high: 80 } },
};
const TARGETS: Schemas['Targets'] = { stepsPerDay: 10000, trainingSessionsPerWeek: 3 };
const SUMMARY = (count: number, trendReady: boolean): Schemas['WeighInSummary'] => ({ weighInCount: count, trendMinWeighIns: 7, trendReady });
const READY_WEIGHT: WeightRead = {
  summary: ready(SUMMARY(20, true)),
  trend: ready([
    { day: '2026-12-04', kg: 81 },
    { day: '2026-12-25', kg: 80.3 },
  ]),
};

type Props = Partial<React.ComponentProps<typeof TodayBlock>>;
async function show(props: Props = {}) {
  await render(
    <ThemeProvider scheme="light">
      <TodayBlock budget={ready(BUDGET)} targets={ready(TARGETS)} stepsToday={6200} weight={READY_WEIGHT} units="METRIC" {...props} />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};

beforeEach(() => jest.clearAllMocks());

describe('the four numbers', () => {
  test('food left, protein of its target, steps of theirs, the weight trend', async () => {
    await show();
    expect(screen.getByText(t('food.budget.single', { value: '1,360', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.numbers.protein', { eaten: '70', target: '140' }))).toBeOnTheScreen();
    expect(screen.getByText(t('thisWeek.numbers.steps', { steps: '6,200', target: '10,000' }))).toBeOnTheScreen();
    expect(screen.getByText(formatWeight(80.3, 'METRIC'))).toBeOnTheScreen();
  });

  test('the weight change over the window is the two trend numbers apart, a plain sign, no judgement', async () => {
    await show();
    expect(screen.getByText('-0.7 kg')).toBeOnTheScreen();
  });

  test('the change names its unit and its period, as the Progress weight card does (the first day drawn to the latest)', async () => {
    await show({ weight: { ...READY_WEIGHT, trend: ready([{ day: '2026-10-02', kg: 85.2 }, { day: '2026-12-25', kg: 80.5 }]) } });
    expect(screen.getByText('-4.7 kg')).toBeOnTheScreen();
    expect(screen.queryByText(/ wk| d$/)).toBeNull();
    expect(screen.getByLabelText(/Down 4\.7 kg over 12 weeks/)).toBeOnTheScreen();
    await screen.unmount();
    await show({ weight: { ...READY_WEIGHT, trend: ready([{ day: '2026-12-20', kg: 80 }, { day: '2026-12-25', kg: 80.5 }]) } });
    expect(screen.getByText('+0.5 kg')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Up 0\.5 kg over 5 days/)).toBeOnTheScreen();
  });

  test('up and steady read the same way', async () => {
    await show({ weight: { ...READY_WEIGHT, trend: ready([{ day: '2026-12-04', kg: 80 }, { day: '2026-12-25', kg: 80.5 }]) } });
    expect(screen.getByText('+0.5 kg')).toBeOnTheScreen();
    await screen.unmount();
    await show({ weight: { ...READY_WEIGHT, trend: ready([{ day: '2026-12-04', kg: 80.3 }, { day: '2026-12-25', kg: 80.3 }]) } });
    expect(screen.getByText('0.0 kg')).toBeOnTheScreen();
  });

  test('pounds for a user on pounds, the change as the two shown numbers differ', async () => {
    await show({ units: 'IMPERIAL' });
    expect(screen.getByText(formatWeight(80.3, 'IMPERIAL'))).toBeOnTheScreen();
    expect(screen.getByText('-1.6 lb')).toBeOnTheScreen();
    expect(screen.queryByText(formatWeight(80.3, 'METRIC'))).toBeNull();
    expect(screen.getByLabelText(/Down 1\.6 lb over 3 weeks/)).toBeOnTheScreen();
  });

  test('one day of trend is the value alone: no change to say', async () => {
    await show({ weight: { ...READY_WEIGHT, trend: ready([{ day: '2026-12-25', kg: 80.3 }]) } });
    expect(screen.getByText(formatWeight(80.3, 'METRIC'))).toBeOnTheScreen();
    expect(screen.queryByText(/^[+-]\d/)).toBeNull();
    expect(screen.queryByText(/ wk$| d$/)).toBeNull();
  });
});

describe('the trend is hidden until the server says it is ready (U8)', () => {
  test('the weigh-ins toward it instead, never the latest weigh-in', async () => {
    await show({ weight: { summary: ready(SUMMARY(3, false)), trend: null } });
    expect(screen.getByText(t('progress.weight.count', { count: 3, min: 7 }))).toBeOnTheScreen();
    expect(screen.queryByText(formatWeight(80.3, 'METRIC'))).toBeNull();
  });

  test('ready but no day in the window: no tile, not "7 of 7"', async () => {
    await show({ weight: { summary: ready(SUMMARY(9, true)), trend: ready([]) } });
    expect(screen.queryByTestId('number-weight')).toBeNull();
    expect(screen.queryByText(t('progress.weight.count', { count: 7, min: 7 }))).toBeNull();
  });

  test('the summary not read (offline, no consent, none): no weight tile, and no complaint', async () => {
    for (const summary of [{ state: 'none' }, { state: 'consent' }, { state: 'failed', problem: 'NoConnection' }] as Loaded<Schemas['WeighInSummary']>[]) {
      await show({ weight: { summary, trend: null } });
      expect(screen.queryByTestId('number-weight')).toBeNull();
      await screen.unmount();
    }
    await show({ weight: undefined });
    expect(screen.queryByTestId('number-weight')).toBeNull();
  });

  test('a trend that could not be read says nothing of the user: no tile, not "7 of 7"', async () => {
    await show({ weight: { summary: ready(SUMMARY(9, true)), trend: { state: 'failed', problem: 'ServerError' } } });
    expect(screen.queryByTestId('number-weight')).toBeNull();
  });
});

describe('what is not there is said, not zero', () => {
  test('steps without Apple Health: the target alone, and a tap leads to connecting it', async () => {
    await show({ stepsToday: null });
    expect(screen.getByText(t('thisWeek.numbers.stepsNone', { target: '10,000' }))).toBeOnTheScreen();
    expect(screen.getByTestId('number-steps-badge')).toBeOnTheScreen();
    expect(screen.queryByText(/^[-–] \//)).toBeNull();
    expect(screen.queryByText(/^0 \//)).toBeNull();
    await press(t('progress.targets.label.stepsOff', { target: '10,000' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'apple' } });
  });

  test('a protein target of 0 (a plan without one): no protein tile', async () => {
    await show({ budget: ready({ ...BUDGET, targetProteinG: 0 }) });
    expect(screen.queryByTestId('number-protein')).toBeNull();
  });

  test('before the first call the starting step target stands in', async () => {
    await show({ targets: { state: 'none' }, starting: ready({ stepsPerDay: 7000 } as Schemas['StartingTarget']) });
    expect(screen.getByText(t('thisWeek.numbers.steps', { steps: '6,200', target: '7,000' }))).toBeOnTheScreen();
  });

  test('no step target (not read): no steps tile', async () => {
    await show({ targets: { state: 'none' } });
    expect(screen.queryByTestId('number-steps')).toBeNull();
  });

  test('no budget: no food line and no protein, the other numbers stay', async () => {
    await show({ budget: { state: 'none' } });
    expect(screen.queryByTestId('food-line')).toBeNull();
    expect(screen.queryByTestId('number-protein')).toBeNull();
    expect(screen.getByTestId('number-steps')).toBeOnTheScreen();
    expect(screen.getByTestId('number-weight')).toBeOnTheScreen();
  });

  test('without the health data consent: the lock line, no protein, steps and weight stay', async () => {
    await show({ budget: { state: 'consent' } });
    expect(screen.getByText(t('thisWeek.food.locked'))).toBeOnTheScreen();
    expect(screen.queryByTestId('number-protein')).toBeNull();
    expect(screen.getByTestId('number-steps')).toBeOnTheScreen();
  });

  test('nothing to show at all: nothing drawn', async () => {
    await show({ budget: { state: 'none' }, targets: { state: 'none' }, weight: undefined });
    expect(screen.toJSON()).toBeNull();
  });
});

describe('each number opens its place', () => {
  test('food left: the day\'s food; Log: the meal', async () => {
    await show();
    await press(t('thisWeek.food.lineLabel', { lead: t('thisWeek.food.left'), amount: t('food.budget.single', { value: '1,360', unit: t('food.budget.kcalUnit') }) }));
    expect(mockPush).toHaveBeenCalledWith('/food');
    await press(t('thisWeek.food.logLabel'));
    expect(mockPush).toHaveBeenCalledWith('/meal');
  });

  test('protein: the day\'s food', async () => {
    await show();
    await press(t('progress.targets.label.protein', { eaten: '70', target: '140' }));
    expect(mockPush).toHaveBeenCalledWith('/food');
  });

  test('steps with Apple Health: Apple Health', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await show();
    await press(t('progress.targets.label.steps', { steps: '6,200', target: '10,000' }));
    expect(open).toHaveBeenCalledWith('x-apple-health://');
  });

  test('weight trend: Progress', async () => {
    await show();
    fireEvent.press(within(screen.getByTestId('number-weight')).getByText(formatWeight(80.3, 'METRIC')));
    expect(mockNavigate).toHaveBeenCalledWith('/progress');
  });

  test('the weigh-ins toward the trend: the weigh-in', async () => {
    await show({ weight: { summary: ready(SUMMARY(3, false)), trend: null } });
    await press(t('progress.weight.spoken', { count: 3, min: 7 }));
    expect(mockPush).toHaveBeenCalledWith('/weigh-in');
  });
});

describe('the tiles share the row', () => {
  test('every tile is an equal share of the row, inside the plus gutter', async () => {
    await show();
    const tiles = ['protein', 'steps', 'weight'].map((id) => StyleSheet.flatten(screen.getByTestId(`number-${id}`).props.style));
    for (const style of tiles) expect(style).toMatchObject({ flexGrow: 1, flexBasis: 0, minWidth: 0 });
    const row = StyleSheet.flatten(screen.getByTestId('number-protein').parent?.props.style);
    expect(row.paddingRight ?? 0).toBe(0);
    // The card keeps the floating "+" gutter on its right end, tiles included (K-1066): nothing is under the "+".
    const card = StyleSheet.flatten(screen.getByTestId('food-line').props.style);
    expect(card.paddingRight).toBeGreaterThan(card.paddingLeft ?? card.padding ?? 0);
  });
});

describe('the numbers as functions', () => {
  test('protein is the middle of the server\'s range against the target', () => {
    expect(proteinNumber(ready(BUDGET))).toEqual({ eaten: 70, target: 140 });
    expect(proteinNumber({ state: 'none' })).toBeNull();
  });
  test('a protein target of 0 is no target: no tile', () => {
    expect(proteinNumber(ready({ ...BUDGET, targetProteinG: 0 }))).toBeNull();
  });
  test('steps before the first call: the starting target stands in when /v1/targets has none', () => {
    const starting = ready({ stepsPerDay: 7000 } as Schemas['StartingTarget']);
    expect(stepsNumber({ state: 'none' }, starting, 3000)).toEqual({ steps: 3000, target: 7000 });
    expect(stepsNumber(ready(TARGETS), starting, 3000)).toEqual({ steps: 3000, target: 10000 });
    expect(stepsNumber({ state: 'none' }, { state: 'none' }, 3000)).toBeNull();
    expect(stepsNumber({ state: 'none' }, undefined, 3000)).toBeNull();
  });
  test('steps keep the target without a count', () => {
    expect(stepsNumber(ready(TARGETS), undefined, null)).toEqual({ steps: null, target: 10000 });
    expect(stepsNumber(ready(TARGETS), undefined, 0)).toEqual({ steps: 0, target: 10000 });
    expect(stepsNumber({ state: 'consent' }, undefined, 5)).toBeNull();
  });
  test('weight: waiting counts cap at the minimum', () => {
    expect(weightNumber({ summary: ready(SUMMARY(12, false)), trend: null }, 'METRIC')).toEqual({ kind: 'waiting', count: 7, min: 7 });
  });
});
