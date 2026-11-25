/** The walk between two places (K-1227): Apple's route when it answers, the straight line x the detour factor when not. The native module is a stand-in. */
import { walkParams as W } from '@/walks/params';
import { findPlaces, straightKm, thinPath, walkBetween } from '@/walks/route';

const home = { lat: 36.8969, lng: 30.7133 };
const gym = { lat: 36.9069, lng: 30.7133 }; // 0.01 degree of latitude north: about 1.112 km

test('the straight line is the great-circle distance', () => {
  expect(straightKm(home, gym)).toBeCloseTo(1.112, 2);
  expect(straightKm(home, home)).toBe(0);
});

const corner = { lat: 36.9019, lng: 30.7163 };
const streets: [number, number][] = [
  [home.lat, home.lng],
  [corner.lat, corner.lng],
  [gym.lat, gym.lng],
];

test("Apple's walking route is used as it comes, in km, not approximate, and its line follows the streets", async () => {
  const walkingRoute = jest.fn(async () => ({ metres: 1830, points: streets }));
  expect(await walkBetween({ walkingRoute }, home, gym)).toEqual({ km: 1.83, approximate: false, path: [home, corner, gym] });
  expect(walkingRoute).toHaveBeenCalledWith(home.lat, home.lng, gym.lat, gym.lng);
});

test("a route whose line is missing or broken keeps Apple's distance and draws the two ends", async () => {
  for (const points of [[], [[home.lat, home.lng]], [[home.lat, Number.NaN], [gym.lat, gym.lng]], [[91, 0], [gym.lat, gym.lng]]] as [number, number][][]) {
    expect(await walkBetween({ walkingRoute: async () => ({ metres: 1830, points }) }, home, gym)).toEqual({ km: 1.83, approximate: false, path: [home, gym] });
  }
});

test.each([
  ['no walking route', async () => null],
  ['a zero route', async () => ({ metres: 0, points: streets })],
  ['a failed request', async () => Promise.reject(new Error('offline'))],
])('with %s the straight line x the detour factor stands in, said to be approximate, drawn straight', async (_name, walkingRoute) => {
  const leg = await walkBetween({ walkingRoute }, home, gym);
  expect(leg.approximate).toBe(true);
  expect(leg.km).toBeCloseTo(straightKm(home, gym) * W.detourFactor, 6);
  expect(leg.path).toEqual([home, gym]);
  expect(W.detourFactor).toBeGreaterThan(1);
});

test('a long line is thinned to the most points the map draws, keeping both ends and the order', () => {
  const many = Array.from({ length: 1000 }, (_, i) => ({ lat: i, lng: -i }));
  const thin = thinPath(many, W.routePointsMax);
  expect(thin).toHaveLength(W.routePointsMax);
  expect(thin[0]).toEqual(many[0]);
  expect(thin.at(-1)).toEqual(many.at(-1));
  for (let i = 1; i < thin.length; i++) expect(thin[i].lat).toBeGreaterThan(thin[i - 1].lat);
  expect(thinPath(many.slice(0, 5), W.routePointsMax)).toEqual(many.slice(0, 5));
});

test('without the native module (Expo Go) it is the same fallback', async () => {
  expect((await walkBetween(null, home, gym)).approximate).toBe(true);
});

test('a search sends nothing under the minimum length and keeps a failure apart from no match', async () => {
  const search = jest.fn(async () => [{ name: 'Gym', address: 'Street 1', lat: 1, lng: 2 }]);
  expect(await findPlaces({ search }, 'ab')).toEqual([]);
  expect(await findPlaces({ search }, '  a ')).toEqual([]);
  expect(search).not.toHaveBeenCalled();
  expect(await findPlaces({ search }, ' Gym street ')).toHaveLength(1);
  expect(search).toHaveBeenCalledWith('Gym street');
  expect(await findPlaces({ search: async () => Promise.reject(new Error('x')) }, 'Gym street')).toBeNull();
  expect(await findPlaces(null, 'Gym street')).toEqual([]);
});
