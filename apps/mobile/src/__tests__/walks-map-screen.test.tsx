/** The walk map (K-1227): a place from a search or a press and hold, two picked, the dotted walk with its distance and steps, kept in My walks. */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { WalkMapScreen } from '@/walks/WalkMapScreen';
import { createPlaces } from '@/walks/places';
import { createWalks } from '@/walks/store';
import { walkParams as W } from '@/walks/params';
import { stepsPerKm, suggestWalk } from '@/walks/suggest';
import { ThemeProvider } from '@/theme/theme';

const mockLines: { dash?: number[]; count: number; coordinates: unknown[]; color?: string; width?: number }[] = [];
// The map's own props (its look) and what the screen asked of it (fit to points, or a region around one point).
const mockMap: { props: Record<string, unknown>; fit: jest.Mock; region: jest.Mock } = { props: {}, fit: jest.fn(), region: jest.fn() };
let mockLongPress: ((event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void) | undefined;
jest.mock('react-native-maps', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef(function MockMap(props: { children: unknown; onLongPress: typeof mockLongPress }, ref) {
    mockLongPress = props.onLongPress;
    mockMap.props = props;
    React.useImperativeHandle(ref, () => ({ fitToCoordinates: mockMap.fit, animateToRegion: mockMap.region }));
    return <View testID="map">{props.children as never}</View>;
  });
  // A mark is drawn by the screen (K-1252): the marker shows its children and is pressed as the map's marker is.
  const Marker = ({ testID, title, children, onPress }: { testID?: string; title?: string; children?: unknown; onPress?: () => void }) => (
    <View testID={testID ?? `marker-${title ?? 'draft'}`} onPress={onPress}>{children as never}</View>
  );
  const Polyline = (p: { lineDashPattern?: number[]; coordinates: unknown[]; strokeColor?: string; strokeWidth?: number }) => {
    mockLines.push({ dash: p.lineDashPattern, count: p.coordinates.length, coordinates: p.coordinates, color: p.strokeColor, width: p.strokeWidth });
    return <View testID="polyline" />;
  };
  return { __esModule: true, default: MapView, Marker, Polyline };
});

let mockServices: Record<string, unknown>;
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

function memoryKv() {
  const items = new Map<string, string>();
  return { getItemAsync: async (k: string) => items.get(k) ?? null, setItemAsync: async (k: string, v: string) => void items.set(k, v), removeItemAsync: async (k: string) => items.delete(k) };
}

const find = jest.fn();
const walk = jest.fn();

beforeEach(async () => {
  mockLines.length = 0;
  mockMap.fit.mockReset();
  mockMap.region.mockReset();
  find.mockReset();
  walk.mockReset();
  const kv = memoryKv();
  mockServices = {
    report: jest.fn(),
    // 170 cm: 1,417 steps a km by the profile's height (K-1216's stride)
    api: { GET: async () => ({ data: { heightCm: 170 }, response: { status: 200 } }) },
    places: await createPlaces({ kv }),
    walks: await createWalks({ kv }),
    geo: { find, walk },
  };
});

const open = async () => render(<ThemeProvider><WalkMapScreen /></ThemeProvider>);

async function addByHold(name: string, latitude: number, longitude: number) {
  await act(async () => mockLongPress?.({ nativeEvent: { coordinate: { latitude, longitude } } }));
  await fireEvent.changeText(await screen.findByLabelText('Name this place'), name);
  await fireEvent.press(screen.getByLabelText('Save this place'));
  // The name shows twice now (the mark's tag on the map and the list, K-1252): the kept place is found by its marker.
  await screen.findByTestId(`marker-${name}`);
}

test('the search says Apple Maps is used and the places stay on the phone, and sends nothing until pressed', async () => {
  await open();
  expect(screen.getByText('Search uses Apple Maps; your places stay on this phone.')).toBeTruthy();
  expect(find).not.toHaveBeenCalled();
});

test('a place from a search result is named and kept', async () => {
  find.mockResolvedValue([{ name: 'Fit Club', address: 'Main St 1', lat: 36.9, lng: 30.7 }]);
  await open();
  await fireEvent.changeText(screen.getByLabelText('Search an address or a place'), 'Fit Club');
  await fireEvent.press(screen.getByText('Search'));
  await fireEvent.press(await screen.findByLabelText('Fit Club, Main St 1. Use this place.'));
  expect((screen.getByLabelText('Name this place') as unknown as { props: { value: string } }).props.value).toBe('Fit Club');
  await fireEvent.press(screen.getByLabelText('Save this place'));
  await screen.findByTestId('marker-Fit Club');
  expect((mockServices.places as { current: () => unknown[] }).current()).toEqual([{ id: '1', name: 'Fit Club', lat: 36.9, lng: 30.7 }]);
});

test('a search that finds nothing, and one that fails, are said apart', async () => {
  find.mockResolvedValueOnce([]).mockResolvedValueOnce(null);
  await open();
  await fireEvent.changeText(screen.getByLabelText('Search an address or a place'), 'nowhere');
  await fireEvent.press(screen.getByText('Search'));
  await screen.findByText(/Nothing found/);
  await fireEvent.press(screen.getByText('Search'));
  await screen.findByText(/Couldn't search/);
});

test('two places picked show the dotted walk, its distance and steps, and it is kept in My walks', async () => {
  walk.mockResolvedValue({ km: 1.8, approximate: false, path: [{ lat: 36.89, lng: 30.7 }, { lat: 36.9, lng: 30.71 }] });
  await open();
  await addByHold('Home', 36.89, 30.7);
  await addByHold('Gym', 36.9, 30.71);
  await fireEvent.press(screen.getByLabelText('Home. Tap to use it as the start or the end.'));
  await fireEvent.press(screen.getByLabelText('Gym. Tap to use it as the start or the end.'));
  // K1 (ADR-094 Ek 7 #5): the sentence is the route slip's spoken label now, the round trip the big number's; #2: the line is solid.
  await screen.findByLabelText('1.8 km one way, about 2,551 steps');
  expect(screen.getByLabelText('5,101 steps there and back')).toBeTruthy();
  expect(walk).toHaveBeenCalledTimes(1);
  expect(mockLines.at(-1)).toMatchObject({ count: 2 });
  expect(mockLines.at(-1)?.dash).toBeUndefined();
  await fireEvent.press(screen.getByLabelText('Save Home to Gym in My walks'));
  await screen.findByText(/Saved in My walks/);
  expect((mockServices.walks as { current: () => unknown[] }).current()).toMatchObject([{ name: 'Home to Gym', km: 1.8 }]);
  // K-1216's suggestion reads that walk as it does a typed one: 5,101 steps there and back covers the 4,800 left.
  const saved = (mockServices.walks as { current: () => { id: string; name: string; km: number }[] }).current();
  expect(suggestWalk({ remaining: 4800, routes: saved, stepsPerKm: stepsPerKm(170) })).toMatchObject({ kind: 'route', route: { name: 'Home to Gym' }, roundTripSteps: 5101 });
});

test("the dotted line follows Apple's route, and nothing is drawn while it is being measured", async () => {
  let answer: (leg: unknown) => void = () => undefined;
  walk.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  await open();
  await addByHold('Home', 36.89, 30.7);
  await addByHold('Gym', 36.9, 30.71);
  await fireEvent.press(screen.getByLabelText('Home. Tap to use it as the start or the end.'));
  mockLines.length = 0;
  await fireEvent.press(screen.getByLabelText('Gym. Tap to use it as the start or the end.'));
  await screen.findByText('Measuring the walk');
  expect(mockLines).toHaveLength(0);
  const path = [{ lat: 36.89, lng: 30.7 }, { lat: 36.895, lng: 30.703 }, { lat: 36.898, lng: 30.709 }, { lat: 36.9, lng: 30.71 }];
  await act(async () => answer({ km: 1.8, approximate: false, path }));
  await screen.findByLabelText(/1.8 km one way/); // K1 (ADR-094 Ek 7 #5): the sentence is the slip's spoken label
  expect(mockLines.at(-1)?.coordinates).toEqual(path.map((p) => ({ latitude: p.lat, longitude: p.lng })));
});

test('a walk Apple could not route says it is approximate', async () => {
  walk.mockResolvedValue({ km: 1.4, approximate: true, path: [{ lat: 36.89, lng: 30.7 }, { lat: 36.9, lng: 30.71 }] });
  await open();
  await addByHold('Home', 36.89, 30.7);
  await addByHold('Gym', 36.9, 30.71);
  await fireEvent.press(screen.getByLabelText('Home. Tap to use it as the start or the end.'));
  await fireEvent.press(screen.getByLabelText('Gym. Tap to use it as the start or the end.'));
  await screen.findByText(/Apple Maps had no route/);
});

test('a blank name is not kept, and a removed place leaves the walk', async () => {
  await open();
  await act(async () => mockLongPress?.({ nativeEvent: { coordinate: { latitude: 1, longitude: 1 } } }));
  await fireEvent.press(await screen.findByLabelText('Save this place'));
  await screen.findByText('Give it a name.');
  await fireEvent.changeText(screen.getByLabelText('Name this place'), 'Home');
  await fireEvent.press(screen.getByLabelText('Save this place'));
  await screen.findByTestId('marker-Home');
  // K1 (ADR-094 Ek 7 #6): no full-width remove button; Edit puts a remove mark on each row.
  await fireEvent.press(screen.getByText('Edit'));
  await fireEvent.press(screen.getByLabelText('Remove Home'));
  await waitFor(() => expect(screen.queryByTestId('marker-Home')).toBeNull());
});

// K-1251 (ADR-094 Ek 6): a walk kept from the map knows its two places, so Today's walk can draw it; a name too long for "From to To" is the place it goes to.
test('a walk kept from the map keeps its two places, and a name too long to fit is the place it goes to', async () => {
  walk.mockResolvedValue({ km: 3.2, approximate: false, path: [{ lat: 36.89, lng: 30.65 }, { lat: 36.9, lng: 30.67 }] });
  await open();
  await addByHold('Akdeniz Universitesi', 36.89, 30.65);
  await addByHold('MACFit', 36.9, 30.67);
  await fireEvent.press(screen.getByLabelText('Akdeniz Universitesi. Tap to use it as the start or the end.'));
  await fireEvent.press(screen.getByLabelText('MACFit. Tap to use it as the start or the end.'));
  await screen.findByText(/one way/);
  await fireEvent.press(screen.getByLabelText('Save MACFit in My walks'));
  await screen.findByText(/Saved in My walks/);
  const places = (mockServices.places as { current: () => { id: string; name: string }[] }).current();
  expect((mockServices.walks as { current: () => unknown[] }).current()).toEqual([{ id: '1', name: 'MACFit', km: 3.2, from: places[0].id, to: places[1].id }]);
});

// K-1252 (ADR-094 Ek 7, Levent 27 Nov: A · route slip): a quiet map with the app's own marks, the search on the map, the slip under it.
describe('the route slip (K-1252)', () => {
  const home = { lat: 36.89, lng: 30.7 };
  const gym = { lat: 36.9, lng: 30.71 };
  const leg = (km: number) => ({ km, approximate: false, path: [home, gym] });
  const minutes = (steps: number) => Math.max(1, Math.round(steps / W.cadence));
  /** Today's steps (Apple Health) and the engine's target, so the slip can say what the walk does for today. */
  function today(steps: number | null, target = 10000) {
    mockServices.syncHealth = async () => ({ stepsToday: steps });
    mockServices.api = { GET: async (path: string) => ({ data: path === '/v1/targets' ? { stepsPerDay: target } : { heightCm: 170 }, response: { status: 200 } }) };
  }
  async function pickBoth() {
    await addByHold('Home', home.lat, home.lng);
    await addByHold('Gym', gym.lat, gym.lng);
    await fireEvent.press(screen.getByLabelText('Home. Tap to use it as the start or the end.'));
    await fireEvent.press(screen.getByLabelText('Gym. Tap to use it as the start or the end.'));
  }

  test('the map is quiet: muted, with no businesses, buildings or compass', async () => {
    await open();
    expect(mockMap.props).toMatchObject({ mapType: 'mutedStandard', showsPointsOfInterests: false, showsBuildings: false, showsCompass: false, pitchEnabled: false });
  });

  test("the places are the app's marks: a ring where the walk starts, a dot where it ends, the rest small and grey", async () => {
    walk.mockResolvedValue(leg(1.8));
    await open();
    await addByHold('Home', home.lat, home.lng);
    await addByHold('Gym', gym.lat, gym.lng);
    expect(screen.getAllByTestId('mark-idle')).toHaveLength(2);
    await fireEvent.press(screen.getByTestId('marker-Home'));
    await fireEvent.press(screen.getByTestId('marker-Gym'));
    await screen.findByLabelText(/one way/);
    expect(screen.getAllByTestId('mark-from')).toHaveLength(1);
    expect(screen.getAllByTestId('mark-to')).toHaveLength(1);
    expect(screen.queryAllByTestId('mark-idle')).toHaveLength(0);
  });

  test('the walk is a solid line on a wider paper edge', async () => {
    walk.mockResolvedValue(leg(1.8));
    await open();
    await pickBoth();
    await screen.findByLabelText(/one way/);
    const [edge, line] = mockLines.slice(-2);
    expect(edge.width).toBeGreaterThan(line.width ?? 0);
    expect(edge.color).not.toBe(line.color);
    expect(line.dash).toBeUndefined();
  });

  test('the search sits on the map; its Search shows once there is something to look for, and Return searches too', async () => {
    find.mockResolvedValue([]);
    await open();
    expect(screen.queryByText('Search')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search an address or a place'), 'Fit');
    expect(screen.getByText('Search')).toBeTruthy();
    await fireEvent(screen.getByLabelText('Search an address or a place'), 'submitEditing');
    await screen.findByText(/Nothing found/);
    expect(find).toHaveBeenCalledWith('Fit');
  });

  test('one place is shown at street scale, not fitted to a single point', async () => {
    await open();
    await addByHold('Home', home.lat, home.lng);
    await waitFor(() => expect(mockMap.region).toHaveBeenCalled());
    const [region] = mockMap.region.mock.calls.at(-1) as [{ latitude: number; longitude: number; latitudeDelta: number }];
    expect(region).toMatchObject({ latitude: home.lat, longitude: home.lng });
    expect(region.latitudeDelta).toBeGreaterThan(0);
    expect(mockMap.fit.mock.calls.every(([points]) => (points as unknown[]).length > 1)).toBe(true);
  });

  test('the slip: the two places, the one-way distance and minutes, the round trip in big numbers', async () => {
    walk.mockResolvedValue(leg(1.8));
    await open();
    await pickBoth();
    const oneWay = Math.round(1.8 * stepsPerKm(170));
    await screen.findByText(`1.8 km · ${minutes(oneWay)} min one way`);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getByText('5,101')).toBeTruthy();
    expect(screen.getByText(`steps there and back · ${minutes(5101)} min`)).toBeTruthy();
    expect(screen.getByText('Add to My walks')).toBeTruthy();
  });

  test("with today's steps read, a walk that covers what is left says so", async () => {
    today(5200);
    walk.mockResolvedValue(leg(1.8));
    await open();
    await pickBoth();
    await screen.findByText('Covers the 4,800 steps left today');
    expect(screen.getByLabelText('5,101 of the 4,800 steps left today')).toBeTruthy();
  });

  test('a walk that does not cover it says what is left, never how short it falls (U7)', async () => {
    today(5200);
    walk.mockResolvedValue(leg(1));
    await open();
    await pickBoth();
    await screen.findByText('4,800 steps left today');
    expect(screen.queryByText(/Covers/)).toBeNull();
    expect(screen.queryByText(/short|more to go|left to cover/i)).toBeNull();
  });

  test("without today's count there is no bar and no line about today", async () => {
    today(null);
    walk.mockResolvedValue(leg(1.8));
    await open();
    await pickBoth();
    await screen.findByText('5,101');
    expect(screen.queryByText(/left today/)).toBeNull();
    expect(screen.queryByLabelText(/steps left today/)).toBeNull();
  });

  test('places are removed from Edit, and Done puts the list back', async () => {
    await open();
    await addByHold('Home', home.lat, home.lng);
    expect(screen.queryByLabelText('Remove Home')).toBeNull();
    await fireEvent.press(screen.getByText('Edit'));
    expect(screen.getByLabelText('Remove Home')).toBeTruthy();
    await fireEvent.press(screen.getByText('Done'));
    expect(screen.queryByLabelText('Remove Home')).toBeNull();
    expect(screen.getByLabelText('Home. Tap to use it as the start or the end.')).toBeTruthy();
  });

  test('one place says to add another; the notes about Apple Maps and holding the map stay', async () => {
    await open();
    await addByHold('Home', home.lat, home.lng);
    expect(screen.getByText('Add one more place: a walk is measured between two.')).toBeTruthy();
    expect(screen.getByText('Search uses Apple Maps; your places stay on this phone.')).toBeTruthy();
    expect(screen.getByText('Or press and hold the map.')).toBeTruthy();
  });

  test('typing a new place\'s name does not move the map again', async () => {
    await open();
    await act(async () => mockLongPress?.({ nativeEvent: { coordinate: { latitude: home.lat, longitude: home.lng } } }));
    const shown = mockMap.region.mock.calls.length + mockMap.fit.mock.calls.length;
    await fireEvent.changeText(screen.getByLabelText('Name this place'), 'H');
    await fireEvent.changeText(screen.getByLabelText('Name this place'), 'Ho');
    expect(mockMap.region.mock.calls.length + mockMap.fit.mock.calls.length).toBe(shown);
  });

  test('removing the last place leaves Edit, so a new place can be picked again', async () => {
    await open();
    await addByHold('Home', home.lat, home.lng);
    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.press(screen.getByLabelText('Remove Home'));
    await waitFor(() => expect(screen.queryByTestId('marker-Home')).toBeNull());
    await addByHold('Gym', gym.lat, gym.lng);
    expect(screen.queryByLabelText('Remove Gym')).toBeNull();
    expect(screen.getByLabelText('Gym. Tap to use it as the start or the end.')).toBeTruthy();
  });
});
