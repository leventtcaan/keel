/** The walk between two places (K-1227): Apple's route when it answers, the straight line x the detour factor when not. The native module is a stand-in. */
import { walkParams as W } from '@/walks/params';
import { findPlaces, straightKm, walkBetween } from '@/walks/route';

const home = { lat: 36.8969, lng: 30.7133 };
const gym = { lat: 36.9069, lng: 30.7133 }; // 0.01 degree of latitude north: about 1.112 km

test('the straight line is the great-circle distance', () => {
  expect(straightKm(home, gym)).toBeCloseTo(1.112, 2);
  expect(straightKm(home, home)).toBe(0);
});

test("Apple's walking route is used as it comes, in km, and is not approximate", async () => {
  const walkingDistance = jest.fn(async () => 1830);
  expect(await walkBetween({ walkingDistance }, home, gym)).toEqual({ km: 1.83, approximate: false });
  expect(walkingDistance).toHaveBeenCalledWith(home.lat, home.lng, gym.lat, gym.lng);
});

test.each([
  ['no walking route', async () => null],
  ['a zero route', async () => 0],
  ['a failed request', async () => Promise.reject(new Error('offline'))],
])('with %s the straight line x the detour factor stands in, said to be approximate', async (_name, walkingDistance) => {
  const leg = await walkBetween({ walkingDistance }, home, gym);
  expect(leg.approximate).toBe(true);
  expect(leg.km).toBeCloseTo(straightKm(home, gym) * W.detourFactor, 6);
  expect(W.detourFactor).toBeGreaterThan(1);
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
