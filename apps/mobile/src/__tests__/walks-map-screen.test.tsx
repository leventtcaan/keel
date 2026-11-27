/** The walk map (K-1227): a place from a search or a press and hold, two picked, the dotted walk with its distance and steps, kept in My walks. */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { WalkMapScreen } from '@/walks/WalkMapScreen';
import { createPlaces } from '@/walks/places';
import { createWalks } from '@/walks/store';
import { stepsPerKm, suggestWalk } from '@/walks/suggest';
import { ThemeProvider } from '@/theme/theme';

const mockLines: { dash?: number[]; count: number; coordinates: unknown[] }[] = [];
let mockLongPress: ((event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void) | undefined;
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MapView = ({ children, onLongPress }: { children: unknown; onLongPress: typeof mockLongPress }) => {
    mockLongPress = onLongPress;
    return <View testID="map">{children as never}</View>;
  };
  const Marker = ({ title }: { title?: string }) => <View testID={`marker-${title ?? 'draft'}`} />;
  const Polyline = (p: { lineDashPattern?: number[]; coordinates: unknown[] }) => {
    mockLines.push({ dash: p.lineDashPattern, count: p.coordinates.length, coordinates: p.coordinates });
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
  await screen.findByText(name);
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
  await screen.findByText('1.8 km one way, about 2,551 steps');
  expect(screen.getByText('5,101 steps there and back')).toBeTruthy();
  expect(walk).toHaveBeenCalledTimes(1);
  expect(mockLines.at(-1)).toMatchObject({ count: 2 });
  expect(mockLines.at(-1)?.dash?.length).toBeGreaterThan(0);
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
  await screen.findByText(/1.8 km one way/);
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
  await fireEvent.press(screen.getByText('Remove Home'));
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
