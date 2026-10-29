/**
 * Progress moves with its data (K-1065): a bar fills to its share, a number counts up to the server's, the muscle map takes its new
 * colours; all of them simply there under Reduce Motion (K-807). Under Jest the library is the stand-in in
 * src/__tests__/support/reanimatedShim.tsx, which reaches a target at once: these test where each ends and whether it was asked to move.
 */
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import type { components } from '@/api/schema';
import { MuscleMap } from '@/components/MuscleMap';
import { ProgressBar } from '@/components/ProgressBar';
import { CountUp } from '@/motion/CountUp';
import * as library from '@/motion/reanimated';
import { useTween } from '@/motion/useTween';
import { MuscleBars } from '@/progress/Parts';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];
type BodyData = readonly { slug?: string; color?: string }[];
const mockBody = jest.fn((_props: { side?: string; data: BodyData }) => null);
jest.mock('react-native-body-highlighter', () => ({ __esModule: true, default: (props: { side?: string; data: BodyData }) => mockBody(props) }));

const inTheme = (node: React.ReactElement) => <ThemeProvider>{node}</ThemeProvider>;
const reduceMotion = (on: boolean) => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(on);
const sets = (muscle: string, doneSets: number, targetSets = 10): Schemas['MuscleSets'] => ({
  muscle,
  plannedSets: targetSets,
  doneSets,
  targetSets,
  plannedShare: 1,
  doneShare: Math.min(1, doneSets / targetSets),
});

beforeEach(() => {
  mockBody.mockClear();
  reduceMotion(false);
});
afterEach(() => jest.restoreAllMocks());

describe('a bar fills to its share', () => {
  test('and follows it when the data changes', async () => {
    const view = await render(inTheme(<ProgressBar value={0.4} label="Protein" />));
    expect(StyleSheet.flatten(screen.getByTestId('progress-fill').props.style).width).toBe('40%');
    await view.rerender(inTheme(<ProgressBar value={0.75} label="Protein" />));
    expect(StyleSheet.flatten(screen.getByTestId('progress-fill').props.style).width).toBe('75%');
  });

  test('sets per muscle: a fill and a count each, and the target line where the scale puts it', async () => {
    await render(inTheme(<MuscleBars muscles={[sets('quads', 6), sets('chest', 14, 10)]} />));
    expect(screen.getByTestId('muscle-bar-quads')).toBeOnTheScreen();
    expect(screen.getByText('6')).toBeOnTheScreen();
    expect(screen.getByText('14')).toBeOnTheScreen();
  });
});

describe('a number counts up to the data', () => {
  test('it ends on the number, written as the caller writes it; a new number is followed', async () => {
    const format = (n: number) => n.toLocaleString('en-US');
    const view = await render(inTheme(<CountUp value={1450} format={format} />));
    expect(screen.getByText('1,450')).toBeOnTheScreen();
    await view.rerender(inTheme(<CountUp value={1820} format={format} />));
    expect(screen.getByText('1,820')).toBeOnTheScreen();
  });
});

describe('Reduce Motion', () => {
  test('on: the value is simply set, no animation is started', async () => {
    reduceMotion(true);
    const timing = jest.spyOn(library, 'withTiming');
    const { result } = await renderHook(() => useTween(80, { reduce: true }));
    await act(async () => {});
    expect(result.current.value).toBe(80);
    expect(timing).not.toHaveBeenCalled();
  });

  test('off: it eases there over the time of the token', async () => {
    const timing = jest.spyOn(library, 'withTiming');
    await renderHook(() => useTween(80, { reduce: false, ms: 600 }));
    expect(timing).toHaveBeenCalledWith(80, expect.objectContaining({ duration: 600 }));
  });

  test('a bar under Reduce Motion is at its share and started nothing', async () => {
    reduceMotion(true);
    const timing = jest.spyOn(library, 'withTiming');
    await render(inTheme(<ProgressBar value={0.5} label="x" />));
    await act(async () => {});
    expect(StyleSheet.flatten(screen.getByTestId('progress-fill').props.style).width).toBe('50%');
    expect(timing.mock.calls.every(([to]) => to === 50) || timing.mock.calls.length === 0).toBe(true);
  });
});

describe('the muscle map takes its new colours', () => {
  const colourOf = (slug: string, call = -1) => mockBody.mock.calls.at(call)?.[0].data.find((d) => d.slug === slug)?.color;

  test('after a change it ends in the new colours', async () => {
    const view = await render(inTheme(<MuscleMap muscles={[sets('chest', 4)]} figure="male" />));
    expect(colourOf('chest')).toBe(palettes.light.accentMid);
    await view.rerender(inTheme(<MuscleMap muscles={[sets('chest', 10)]} figure="male" />));
    expect(colourOf('chest')).toBe(palettes.light.accent);
  });

  test('the old drawing stays over the new while it fades (the fade not done yet), and is not drawn at rest', async () => {
    const timing = jest.spyOn(library, 'withTiming').mockImplementation((to) => to as never); // the fade never reports it finished
    const view = await render(inTheme(<MuscleMap muscles={[sets('chest', 4)]} figure="male" />));
    expect(mockBody).toHaveBeenCalledTimes(2); // front, back: nothing drawn twice at rest
    mockBody.mockClear();
    await view.rerender(inTheme(<MuscleMap muscles={[sets('chest', 10)]} figure="male" />));
    expect(timing).toHaveBeenCalledWith(0, expect.objectContaining({ duration: expect.any(Number) }), expect.any(Function));
    // The old drawing (partly done) is drawn over the new one (done).
    const drawn = mockBody.mock.calls.map(([props]) => props.data.find((d) => d.slug === 'chest')?.color);
    expect(drawn).toContain(palettes.light.accentMid);
    expect(drawn.at(-1)).toBe(palettes.light.accent);
  });

  test('under Reduce Motion nothing fades: the new drawing alone', async () => {
    reduceMotion(true);
    const view = await render(inTheme(<MuscleMap muscles={[sets('chest', 4)]} figure="male" />));
    await act(async () => {});
    mockBody.mockClear();
    await view.rerender(inTheme(<MuscleMap muscles={[sets('chest', 10)]} figure="male" />));
    expect(mockBody.mock.calls.map(([props]) => props.data.find((d) => d.slug === 'chest')?.color).every((c) => c === palettes.light.accent)).toBe(true);
  });
});
