/** "My places" (K-1227): named points kept on the phone only, at most the limit, deletable, gone with the account. */
import { walkParams as W } from '@/walks/params';
import { createPlaces } from '@/walks/places';

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}

test('keeps named places across a start, at most the limit', async () => {
  const kv = memoryKv();
  const places = await createPlaces({ kv });
  expect(places.current()).toEqual([]);
  await places.add({ name: '  Home ', lat: 36.89, lng: 30.7 });
  for (let i = 1; i < W.placesMax; i++) await places.add({ name: `P${i}`, lat: 36.9, lng: 30.7 });
  await expect(places.add({ name: 'Extra', lat: 36.9, lng: 30.7 })).rejects.toMatchObject({ name: 'PlaceLimit' });
  expect(places.current()[0]).toEqual({ id: '1', name: 'Home', lat: 36.89, lng: 30.7 });
  expect((await createPlaces({ kv })).current()).toEqual(places.current());
});

test('a blank or overlong name and a point off the globe are refused', async () => {
  const places = await createPlaces({ kv: memoryKv() });
  await expect(places.add({ name: '  ', lat: 1, lng: 1 })).rejects.toMatchObject({ name: 'PlaceInvalid' });
  await expect(places.add({ name: 'x'.repeat(W.nameMaxChars + 1), lat: 1, lng: 1 })).rejects.toMatchObject({ name: 'PlaceInvalid' });
  await expect(places.add({ name: 'A', lat: 91, lng: 1 })).rejects.toMatchObject({ name: 'PlaceInvalid' });
  await expect(places.add({ name: 'A', lat: 1, lng: NaN })).rejects.toMatchObject({ name: 'PlaceInvalid' });
  expect(places.current()).toEqual([]);
});

test('a damaged or foreign value kept is read as no places', async () => {
  for (const kept of ['not json', '{"a":1}', '[{"id":"1","name":"A","lat":"x","lng":2}]']) {
    const kv = memoryKv();
    kv.items.set('places.items', kept);
    expect((await createPlaces({ kv })).current()).toEqual([]);
  }
});

test('removing frees the place, listeners hear every change, forget removes everything kept', async () => {
  const kv = memoryKv();
  const places = await createPlaces({ kv });
  const heard = jest.fn();
  places.subscribe(heard);
  const home = await places.add({ name: 'Home', lat: 1, lng: 1 });
  await places.add({ name: 'Gym', lat: 2, lng: 2 });
  await places.remove(home.id);
  expect(places.current().map((p) => p.name)).toEqual(['Gym']);
  await places.forget();
  expect(places.current()).toEqual([]);
  expect(kv.items.size).toBe(0);
  expect(heard).toHaveBeenCalledTimes(4);
});
