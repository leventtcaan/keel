/**
 * Today's walk (K-1251, ADR-094 Ek 6): the steps left, the map of the walk that covers them and which walk covers it, on a page of its own,
 * opened from This week's walk line and from the cardio sheet. The map is the paid part (Levent, 27 Nov: option 1): without a subscription a
 * lock card and "See plans" stand in its place; the steps, the minutes and the walks stay free. A subscription that cannot be read is not a lock.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/theme';
import { PaidWalkMapScreen } from '@/walks/PaidWalkMap';
import { createPlaces } from '@/walks/places';
import { createWalks } from '@/walks/store';
import { walkOptions } from '@/walks/suggest';
import { WalkTodayScreen } from '@/walks/WalkTodayScreen';

const mockPush = jest.fn();
// Each screen's focus effects, so a test can bring the screen back into view (back from the paywall).
const mockFocus = new Set<() => void>();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      mockFocus.add(effect);
      effect();
      return () => void mockFocus.delete(effect);
    }, [effect]);
  },
}));
const refocus = () => act(async () => mockFocus.forEach((effect) => effect()));
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MapView = ({ children }: { children: unknown }) => <View testID="map">{children as never}</View>;
  const Marker = ({ testID, title, children }: { testID?: string; title?: string; children?: unknown }) => <View testID={testID ?? `marker-${title ?? 'draft'}`}>{children as never}</View>;
  const Polyline = () => <View testID="polyline" />;
  return { __esModule: true, default: MapView, Marker, Polyline };
});

let mockServices: Record<string, unknown>;
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

function memoryKv() {
  const items = new Map<string, string>();
  return { getItemAsync: async (k: string) => items.get(k) ?? null, setItemAsync: async (k: string, v: string) => void items.set(k, v), removeItemAsync: async (k: string) => items.delete(k) };
}

type Subscription = { appUserId: string; active: boolean } | 'fails';
let subscription: Subscription;
let stepsToday: number | null;
const walk = jest.fn();
const answer = (data: unknown) => ({ data, response: { status: 200 } });

async function services() {
  const kv = memoryKv();
  const places = await createPlaces({ kv });
  const walks = await createWalks({ kv });
  return {
    report: jest.fn(),
    places,
    walks,
    geo: { find: jest.fn(), walk },
    syncHealth: async () => ({ stepsToday }),
    api: {
      GET: async (path: string) => {
        if (path === '/v1/targets') return answer({ stepsPerDay: 10000, trainingSessionsPerWeek: 3 });
        // 180 cm: 1,339 steps a km (stride 0.415 x height, data/parameters/walks.json)
        if (path === '/v1/profile') return answer({ heightCm: 180 });
        if (path === '/v1/subscription') {
          if (subscription === 'fails') throw new Error('offline');
          return answer(subscription);
        }
        return { data: undefined, response: { status: 404 } };
      },
    },
  };
}

beforeEach(async () => {
  mockPush.mockReset();
  walk.mockReset();
  walk.mockResolvedValue({ km: 3.165, approximate: false, path: [{ lat: 36.89, lng: 30.65 }, { lat: 36.9, lng: 30.67 }] });
  subscription = { appUserId: 'u', active: true };
  stepsToday = 4200;
  mockServices = await services();
});

/** The two places and the walk between them, as the map screen keeps them; and a walk typed in km. */
async function keepWalks() {
  const places = mockServices.places as Awaited<ReturnType<typeof createPlaces>>;
  const walks = mockServices.walks as Awaited<ReturnType<typeof createWalks>>;
  const home = await places.add({ name: 'Campus', lat: 36.89, lng: 30.65 });
  const gym = await places.add({ name: 'Gym', lat: 36.9, lng: 30.67 });
  await walks.add({ name: 'Gym', km: 3.165, from: home.id, to: gym.id });
  await walks.add({ name: 'Market', km: 0.6 });
}

const open = async () => {
  await render(
    <ThemeProvider scheme="light">
      <WalkTodayScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
};

describe('which walk covers the steps left (pure)', () => {
  const routes = [
    { id: '1', name: 'Gym', km: 3.165 },
    { id: '2', name: 'Market', km: 0.6 },
  ];
  test('each walk with its steps there and back and its own minutes; the engine’s pick covers it', () => {
    // 2 x 3.165 km x 1,339 = 8,476 steps, at 110 a minute 77 min; 2 x 0.6 x 1,339 = 1,607 steps, 15 min
    expect(walkOptions({ remaining: 5800, routes, stepsPerKm: 1339 })).toEqual([
      { route: routes[0], roundTripSteps: 8476, minutes: 77, covers: true },
      { route: routes[1], roundTripSteps: 1607, minutes: 15, covers: false },
    ]);
  });
  test('none covers it when nothing is left to cover, or no walk is in reach', () => {
    expect(walkOptions({ remaining: 300, routes, stepsPerKm: 1339 }).some((o) => o.covers)).toBe(false);
    // 8,476 is more than 1.5 x 5,000: too far over to be the walk for it
    expect(walkOptions({ remaining: 5000, routes, stepsPerKm: 1339 }).some((o) => o.covers)).toBe(false);
  });
});

describe("today's walk", () => {
  test('the steps left with the bar and the minutes, the walks with the one that covers it marked, and nothing said of the shortfall (U7)', async () => {
    await keepWalks();
    await open();
    expect(screen.getByText("Today's walk")).toBeTruthy();
    expect(screen.getByText('5,800 steps left')).toBeTruthy();
    // 5,800 at 110 a minute: 53 min
    expect(screen.getByText('4,200 of 10,000 · about 53 min of walking')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 42 });
    expect(screen.getByText('Which walk covers it')).toBeTruthy();
    expect(screen.getByLabelText('Campus to Gym covers today’s steps: 8,476 steps there and back, about 77 minutes.')).toBeTruthy();
    expect(screen.getByLabelText('Market: 1,607 steps there and back, about 15 minutes.')).toBeTruthy();
    expect(screen.getAllByText('Covers it')).toHaveLength(1);
    expect(screen.queryByText(/short|missing|4,193/)).toBeNull();
  });

  test('with a subscription, the map draws the covering walk between its two places, measured once', async () => {
    await keepWalks();
    await open();
    expect(screen.getByTestId('map')).toBeTruthy();
    // K1 (ADR-094 Ek 7 #2): the walk is two lines now, its paper edge and the petrol line on it.
    expect(screen.getAllByTestId('polyline')).toHaveLength(2);
    expect(screen.getByTestId('marker-Campus')).toBeTruthy();
    expect(screen.getByTestId('marker-Gym')).toBeTruthy();
    expect(walk).toHaveBeenCalledTimes(1);
    expect(walk.mock.calls[0][0]).toMatchObject({ name: 'Campus' });
    expect(walk.mock.calls[0][1]).toMatchObject({ name: 'Gym' });
  });

  test('without one, a lock card and See plans stand where the map was; the steps and the walks stay', async () => {
    subscription = { appUserId: 'u', active: false };
    await keepWalks();
    await open();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(walk).not.toHaveBeenCalled();
    expect(screen.getByText('The map and routes come with a subscription.')).toBeTruthy();
    expect(screen.getByText('5,800 steps left')).toBeTruthy();
    expect(screen.getAllByText('Covers it')).toHaveLength(1);
    await fireEvent.press(screen.getByText('See plans'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  test('back from the paywall with a subscription, the map is there: the subscription is read again whenever the page comes into view', async () => {
    subscription = { appUserId: 'u', active: false };
    await keepWalks();
    await open();
    expect(screen.queryByTestId('map')).toBeNull();
    subscription = { appUserId: 'u', active: true };
    await refocus();
    expect(screen.getByTestId('map')).toBeTruthy();
  });

  test('when the walk that covers it is a typed one, no other walk is drawn as if it were', async () => {
    await keepWalks();
    const walks = mockServices.walks as Awaited<ReturnType<typeof createWalks>>;
    // 2 x 2.4 km x 1,339 = 6,427 steps there and back: closer over the 5,800 left than the map walk's 8,476, so it is the pick
    await walks.add({ name: 'Park', km: 2.4 });
    await open();
    expect(screen.getByLabelText('Park covers today’s steps: 6,427 steps there and back, about 58 minutes.')).toBeTruthy();
    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.queryByTestId('polyline')).toBeNull();
    expect(walk).not.toHaveBeenCalled();
  });

  test('a subscription that cannot be read is not a lock: the map is said not to load', async () => {
    subscription = 'fails';
    await keepWalks();
    await open();
    expect(screen.queryByText('The map and routes come with a subscription.')).toBeNull();
    expect(screen.getByText("Couldn't load the map. Try again later.")).toBeTruthy();
  });

  test('with no places, the map asks for them', async () => {
    await open();
    expect(screen.getByText('Add your places to see the walk on the map.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add places'));
    expect(mockPush).toHaveBeenCalledWith('/walk-map');
  });

  test('without a count from Apple Health, the target alone and no steps said as left', async () => {
    stepsToday = null;
    await keepWalks();
    await open();
    expect(screen.getByText('Your target is 10,000 steps. With Apple Health on, this shows what is left.')).toBeTruthy();
    expect(screen.queryByText(/steps left/)).toBeNull();
    expect(screen.queryByText('Covers it')).toBeNull();
  });

  test('a day whose steps are in says so', async () => {
    stepsToday = 9700;
    await open();
    expect(screen.getByText("Today's steps are in")).toBeTruthy();
    expect(screen.queryByText(/steps left/)).toBeNull();
  });

  test('the walks are added and changed on My walks', async () => {
    await open();
    expect(screen.getByText('No walks yet. Add the ones you really take.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add or change walks'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'walks' } });
  });
});

describe('the walk map screen is the paid part too', () => {
  const openMap = async () => {
    await render(
      <ThemeProvider scheme="light">
        <PaidWalkMapScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
  };
  test('without a subscription, the lock and no map', async () => {
    subscription = { appUserId: 'u', active: false };
    await openMap();
    expect(screen.getByText('Walk map')).toBeTruthy();
    expect(screen.getByText('The map and routes come with a subscription.')).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
  });
  test('with one, the map screen', async () => {
    await openMap();
    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.getByLabelText('Search an address or a place')).toBeTruthy();
  });
});
