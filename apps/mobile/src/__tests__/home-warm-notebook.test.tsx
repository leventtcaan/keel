/**
 * This week in ADR-094's language (9c-2, prototype gorsel-yon/y5-e1): the week is a path on the soft ground of time, the
 * walked part and today in coral, a day done a petrol tick; today's numbers sit in one sand strip, each with a thin coral
 * bar of how far the day came, no white tiles in it.
 */
import { act, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { DecisionBlock } from '@/components/DecisionBlock';
import { TrendLine } from '@/components/TrendLine';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes } from '@/theme/tokens';
import { TodayBlock } from '@/today/TodayBlock';
import type { Loaded } from '@/today/today';
import { WeekStrip } from '@/today/WeekStrip';
import type { WeightRead } from '@/today/numbers';
import type { StripDay } from '@/today/week';

type Schemas = components['schemas'];

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => ({ report: jest.fn() }) }));

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
/** Monday trained, Tuesday today (a rest day), Wednesday, Friday and Saturday planned. */
const DAYS: StripDay[] = WEEKDAYS.map((weekday, i) => {
  const date = `2026-11-${String(23 + i).padStart(2, '0')}`;
  return { weekday, date, trained: i === 0, logged: false, planned: [2, 4, 5].includes(i), today: i === 1 };
});
const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe.each(['light', 'dark'] as ColorScheme[])('%s theme', (scheme) => {
  const p = palettes[scheme];

  describe('the week path', () => {
    const show = () =>
      render(
        <ThemeProvider scheme={scheme}>
          <WeekStrip head={{ week: null, record: { onTrack: 9, counted: 11 }, countedByWeek: false }} days={DAYS} />
        </ThemeProvider>,
      );

    test('lies on the soft ground of time', async () => {
      await show();
      expect(flat('week-path')).toMatchObject({ backgroundColor: p.tintTime });
    });

    test('the line runs through the days; the walked part, Monday to today, is coral', async () => {
      await show();
      // The line still to walk reads on the ground (3:1, WCAG 1.4.11): the control edge, whose contrast contrast.test.ts holds.
      expect(flat('week-line')).toMatchObject({ backgroundColor: p.edge });
      // Seven equal columns: Monday's centre is at 1/14, today (Tuesday, the second) one column on.
      expect(flat('week-walked')).toMatchObject({ backgroundColor: p.progress, left: `${100 / 14}%`, width: `${100 / 7}%` });
    });

    test.each([0, 1, 2, 3, 4, 5, 6])('today the day at %i: the walked part ends at its centre', async (at) => {
      await render(
        <ThemeProvider scheme={scheme}>
          <WeekStrip head={{ week: null, record: null, countedByWeek: true }} days={DAYS.map((day, i) => ({ ...day, today: i === at }))} />
        </ThemeProvider>,
      );
      expect(flat('week-walked')).toMatchObject({ left: `${100 / 14}%`, width: `${(at * 100) / 7}%` });
    });

    test('no day is today (a week shown that is not this one): no walked part', async () => {
      await render(
        <ThemeProvider scheme={scheme}>
          <WeekStrip head={{ week: null, record: null, countedByWeek: true }} days={DAYS.map((day) => ({ ...day, today: false }))} />
        </ThemeProvider>,
      );
      expect(screen.queryByTestId('week-walked')).toBeNull();
      expect(screen.getByTestId('week-line')).toBeOnTheScreen();
    });

    test("today is ringed in coral and its letter is coral; no other day has a ring", async () => {
      await show();
      expect(flat('ring-2026-11-24')).toMatchObject({ borderColor: p.progress });
      expect(StyleSheet.flatten(within(screen.getByTestId('day-2026-11-24')).getByText(/./).props.style).color).toBe(p.progressText);
      expect(screen.queryByTestId('ring-2026-11-23')).toBeNull();
    });

    test('a day done is a petrol tick, a day planned a petrol ring on the path ground', async () => {
      await show();
      expect(flat('mark-2026-11-23')).toMatchObject({ backgroundColor: p.accent });
      expect(within(screen.getByTestId('day-2026-11-23')).getByTestId('tick')).toBeOnTheScreen();
      expect(flat('mark-2026-11-25')).toMatchObject({ borderColor: p.accent, backgroundColor: p.tintTime });
    });
  });

  describe("today's numbers", () => {
    const ready = <T,>(value: T): Loaded<T> => ({ state: 'ready', value });
    const BUDGET: Schemas['DayBudget'] = {
      day: '2026-11-24',
      targetKcal: 2050,
      targetProteinG: 175,
      eaten: { kcal: { low: 1200, high: 1260 }, proteinG: { low: 110, high: 114 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
      left: { kcal: { low: 790, high: 850 }, proteinG: { low: 61, high: 65 } },
    };
    const show = async () => {
      await render(
        <ThemeProvider scheme={scheme}>
          <TodayBlock budget={ready(BUDGET)} targets={ready({ stepsPerDay: 10000, trainingSessionsPerWeek: 4 })} stepsToday={6240} units="METRIC" />
        </ThemeProvider>,
      );
      await act(async () => {});
    };

    test('sit in the sand strip with no tile of their own', async () => {
      await show();
      expect(flat('food-line')).toMatchObject({ backgroundColor: p.surface });
      expect(within(screen.getByTestId('food-line')).getByTestId('number-protein')).toBeOnTheScreen();
      expect(flat('number-protein').backgroundColor).toBeUndefined();
      expect(flat('number-steps').backgroundColor).toBeUndefined();
    });

    test('protein and steps each have a thin coral bar of how far the day came', async () => {
      await show();
      for (const id of ['number-protein', 'number-steps']) {
        expect(within(screen.getByTestId(id)).getByRole('progressbar')).toBeOnTheScreen();
        expect(StyleSheet.flatten(within(screen.getByTestId(id)).getByTestId('progress-fill').props.style)).toMatchObject({ backgroundColor: p.progress });
      }
    });

    test('the strip keeps no empty gutter at its right end for the "+" (gezinti, Durak 1)', async () => {
      await show();
      expect(flat('food-line').paddingRight).toBeUndefined();
    });
  });
});

// 9c-3 (prototype gorsel-yon/y5-e1): the call's arrow sits on the call's own line, no empty band above it; the weight has a
// line of its own under the day's numbers, the trend drawn from the server's points.
describe.each(['light', 'dark'] as ColorScheme[])('%s theme, 9c-3', (scheme) => {
  const p = palettes[scheme];

  test("the call's arrow is on the title's line, not on a band of its own", async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <DecisionBlock title="Daha çok hareket" aside={<Text testID="mark">›</Text>} onPress={() => {}} />
      </ThemeProvider>,
    );
    // The nearest row around the arrow holds the title too.
    let row = screen.getByTestId('mark').parent;
    while (row !== null && StyleSheet.flatten(row.props.style)?.flexDirection !== 'row') row = row.parent;
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Daha çok hareket')).toBeOnTheScreen();
  });

  describe('the weight line', () => {
    const ready = <T,>(value: T): Loaded<T> => ({ state: 'ready', value });
    const POINTS = [89.6, 89.0, 88.4, 88.0, 87.7, 87.4].map((kg, i) => ({ day: `2026-10-${String(13 + 7 * i).padStart(2, '0')}`, kg }));
    const WEIGHT: WeightRead = { summary: ready({ weighInCount: 30, trendMinWeighIns: 7, trendReady: true }), trend: ready(POINTS) };
    const show = async () => {
      await render(
        <ThemeProvider scheme={scheme}>
          <TodayBlock budget={{ state: 'none' }} targets={ready({ stepsPerDay: 10000, trainingSessionsPerWeek: 4 })} stepsToday={6240} weight={WEIGHT} units="METRIC" />
        </ThemeProvider>,
      );
      await act(async () => {});
    };

    test('stands on its own line under the other numbers, the kilos in the serif voice', async () => {
      await show();
      const weight = screen.getByTestId('number-weight');
      expect(within(weight).queryByTestId('number-steps')).toBeNull();
      expect(StyleSheet.flatten(weight.props.style)).toMatchObject({ flexDirection: 'row' });
      expect(StyleSheet.flatten(within(weight).getByText('87.4 kg').props.style)).toMatchObject({ fontFamily: 'ui-serif' });
    });

    test("draws the trend from the server's points in petrol, the latest point marked", async () => {
      await show();
      // The drawing is hidden from screen readers (the number and its change are read), so it is looked up among hidden ones.
      const line = screen.getByTestId('trend-line', { includeHiddenElements: true });
      // One move to the oldest point, then a segment to each next one.
      expect(String(line.props.d).match(/[ML]/g)).toHaveLength(POINTS.length);
      expect(screen.getByTestId('trend-end', { includeHiddenElements: true })).toBeTruthy();
    });
  });
});

describe('9c-3 edges', () => {
  test("a block that does not open keeps its mark on a row of its own (the paywall's tag, v2 approved)", async () => {
    await render(
      <ThemeProvider scheme="light">
        <DecisionBlock title="Pro" aside={<Text testID="mark">Yours</Text>} />
      </ThemeProvider>,
    );
    let row = screen.getByTestId('mark').parent;
    while (row !== null && StyleSheet.flatten(row.props.style)?.flexDirection !== 'row') row = row.parent;
    expect(within(row!).queryByText('Pro')).toBeNull();
  });

  test.each([
    ['flat', [80, 80, 80]],
    ['two points', [81, 80.4]],
  ])('the trend line draws a %s series inside its box', async (_, points) => {
    await render(
      <ThemeProvider scheme="light">
        <TrendLine points={points} />
      </ThemeProvider>,
    );
    const d = String(screen.getByTestId('trend-line', { includeHiddenElements: true }).props.d);
    expect(d.match(/[ML]/g)).toHaveLength(points.length);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  test('one point is no line', async () => {
    await render(
      <ThemeProvider scheme="light">
        <TrendLine points={[80]} />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId('trend-line', { includeHiddenElements: true })).toBeNull();
  });

  test('the weight first in its card (no numbers above it) has no ruled line on top', async () => {
    const ready = <T,>(value: T): Loaded<T> => ({ state: 'ready', value });
    const WEIGHT: WeightRead = { summary: ready({ weighInCount: 30, trendMinWeighIns: 7, trendReady: true }), trend: ready([{ day: '2026-11-01', kg: 88 }, { day: '2026-11-24', kg: 87.4 }]) };
    await render(
      <ThemeProvider scheme="light">
        <TodayBlock budget={{ state: 'none' }} targets={{ state: 'none' }} weight={WEIGHT} units="METRIC" />
      </ThemeProvider>,
    );
    await act(async () => {});
    expect(StyleSheet.flatten(screen.getByTestId('number-weight').props.style).borderTopWidth).toBeUndefined();
  });
});
