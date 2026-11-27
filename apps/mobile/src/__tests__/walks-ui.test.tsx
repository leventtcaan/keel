/** The walk line under today's numbers and the "My walks" page (K-1216). */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { components } from '@/api/schema';
import { WalksEditor } from '@/settings/WalksEditor';
import { ThemeProvider } from '@/theme/theme';
import { TodayBlock } from '@/today/TodayBlock';
import type { Loaded } from '@/today/today';
import { createWalks } from '@/walks/store';

type Schemas = components['schemas'];
let mockSystem: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockWalks: Awaited<ReturnType<typeof createWalks>>;
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => ({ report: () => {}, walks: mockWalks }),
  useUnits: () => mockSystem,
}));

const ready = <T,>(value: T): Loaded<T> => ({ state: 'ready', value });
const BUDGET: Schemas['DayBudget'] = {
  day: '2026-12-25',
  targetKcal: 2300,
  targetProteinG: 140,
  eaten: { kcal: { low: 900, high: 1100 }, proteinG: { low: 60, high: 80 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
  left: { kcal: { low: 1240, high: 1480 }, proteinG: { low: 60, high: 80 } },
};
const TARGETS: Schemas['Targets'] = { stepsPerDay: 10000, trainingSessionsPerWeek: 3 };

function memoryKv() {
  const items = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}
beforeEach(async () => {
  mockSystem = 'METRIC';
  mockWalks = await createWalks({ kv: memoryKv() });
});

const block = (props: Partial<React.ComponentProps<typeof TodayBlock>>) => (
  <ThemeProvider scheme="light">
    <TodayBlock budget={ready(BUDGET)} targets={ready(TARGETS)} stepsToday={6000} units="METRIC" {...props} />
  </ThemeProvider>
);

describe('the line under the numbers, on the first screen (home budget 74, K-1216)', () => {
  test('the route and back, said as an offer, with a whole sentence for a screen reader', async () => {
    await render(block({ walk: { remaining: 4000, suggestion: { kind: 'route', route: { id: '1', name: 'Gym', km: 1.8 }, roundTripSteps: 5040, minutes: 36 } } }));
    expect(screen.getByTestId('walk-line')).toHaveTextContent('4,000 left: Gym and back');
    expect(screen.getByTestId('walk-line').props.accessibilityLabel).toContain('about 36 minutes of walking');
  });

  test('or the minutes', async () => {
    await render(block({ walk: { remaining: 3500, suggestion: { kind: 'minutes', minutes: 32 } } }));
    expect(screen.getByTestId('walk-line')).toHaveTextContent('3,500 left, about 32 min');
  });

  test('nothing without a walk (nothing left, or Health not read)', async () => {
    await render(block({ walk: null }));
    expect(screen.queryByTestId('walk-line')).toBeNull();
  });

  test('never without the count from Health, whatever walk it was handed', async () => {
    await render(block({ stepsToday: null, walk: { remaining: 4000, suggestion: { kind: 'minutes', minutes: 36 } } }));
    expect(screen.queryByTestId('walk-line')).toBeNull();
  });
});

describe("the line opens today's walk (K-1251, ADR-094 Ek 6)", () => {
  test("a tap opens Today's walk, not Apple Health, and says so", async () => {
    await render(block({ walk: { remaining: 4000, suggestion: { kind: 'minutes', minutes: 36 } } }));
    expect(screen.getByTestId('walk-line').props.accessibilityHint).toBe("Opens today's walk");
    await fireEvent.press(screen.getByTestId('walk-line'));
    expect(router.push).toHaveBeenCalledWith('/walk');
  });
});

describe('My walks', () => {
  test('adds a walk in km, lists it, removes it', async () => {
    await render(
      <ThemeProvider scheme="light">
        <WalksEditor />
      </ThemeProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Gym');
    await fireEvent.changeText(screen.getByLabelText('Distance, one way'), '1.8');
    await fireEvent.press(screen.getByLabelText('Add this walk'));
    await waitFor(() => expect(mockWalks.current()).toEqual([{ id: '1', name: 'Gym', km: 1.8 }]));
    expect(screen.getByLabelText('Gym, 1.8 km one way')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Gym, 1.8 km one way'));
    await waitFor(() => expect(mockWalks.current()).toEqual([]));
  });

  test('in miles, the distance is converted once and shown back in miles', async () => {
    mockSystem = 'IMPERIAL';
    await render(
      <ThemeProvider scheme="light">
        <WalksEditor />
      </ThemeProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Park');
    await fireEvent.changeText(screen.getByLabelText('Distance, one way'), '1');
    await fireEvent.press(screen.getByLabelText('Add this walk'));
    await waitFor(() => expect(mockWalks.current()).toHaveLength(1));
    expect(mockWalks.current()[0].km).toBe(1.609);
    expect(screen.getByLabelText('Park, 1 mi one way')).toBeTruthy();
  });

  test('a missing name or a bad distance says so and saves nothing; at three, the form gives way to a line', async () => {
    await render(
      <ThemeProvider scheme="light">
        <WalksEditor />
      </ThemeProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Gym');
    await fireEvent.changeText(screen.getByLabelText('Distance, one way'), 'far');
    await fireEvent.press(screen.getByLabelText('Add this walk'));
    expect(mockWalks.current()).toEqual([]);
    expect(screen.getByText('Give it a name and a distance, like 1.8.')).toBeTruthy();
    for (const name of ['A', 'B', 'C']) await act(async () => mockWalks.add({ name, km: 1 }));
    expect(screen.getByText('Three walks is the most. Remove one to add another.')).toBeTruthy();
    expect(screen.queryByLabelText('Add this walk')).toBeNull();
  });
});
