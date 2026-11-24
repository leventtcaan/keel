/** "My walks" (K-1216): up to three named one-way distances, kept on the phone only, deletable, gone with the account. */
import { walkParams as W } from '@/walks/params';
import { createWalks } from '@/walks/store';

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}

test('adds named routes, kept across a start, at most the limit', async () => {
  const kv = memoryKv();
  const walks = await createWalks({ kv });
  expect(walks.current()).toEqual([]);
  await walks.add({ name: '  Gym ', km: 1.8 });
  await walks.add({ name: 'Park', km: 0.9 });
  await walks.add({ name: 'Work', km: 2.4 });
  await expect(walks.add({ name: 'Extra', km: 1 })).rejects.toMatchObject({ name: 'WalkLimit' });
  expect(W.routesMax).toBe(3);
  expect(walks.current().map((r) => [r.name, r.km])).toEqual([['Gym', 1.8], ['Park', 0.9], ['Work', 2.4]]);
  expect((await createWalks({ kv })).current()).toEqual(walks.current());
});

test('a blank or overlong name and a bad distance are refused', async () => {
  const walks = await createWalks({ kv: memoryKv() });
  await expect(walks.add({ name: '   ', km: 1 })).rejects.toMatchObject({ name: 'WalkInvalid' });
  await expect(walks.add({ name: 'x'.repeat(W.nameMaxChars + 1), km: 1 })).rejects.toMatchObject({ name: 'WalkInvalid' });
  await expect(walks.add({ name: 'Gym', km: 0 })).rejects.toMatchObject({ name: 'WalkInvalid' });
  await expect(walks.add({ name: 'Gym', km: W.routeMaxKm + 1 })).rejects.toMatchObject({ name: 'WalkInvalid' });
});

test('removing one keeps the others and frees the place', async () => {
  const walks = await createWalks({ kv: memoryKv() });
  await walks.add({ name: 'Gym', km: 1.8 });
  await walks.add({ name: 'Park', km: 0.9 });
  const [gym] = walks.current();
  await walks.remove(gym.id);
  expect(walks.current().map((r) => r.name)).toEqual(['Park']);
  await walks.add({ name: 'Work', km: 2 });
  expect(new Set(walks.current().map((r) => r.id)).size).toBe(2);
});

test('listeners hear every change; forget removes everything kept', async () => {
  const kv = memoryKv();
  const walks = await createWalks({ kv });
  const heard = jest.fn();
  walks.subscribe(heard);
  await walks.add({ name: 'Gym', km: 1.8 });
  await walks.forget();
  expect(heard).toHaveBeenCalledTimes(2);
  expect(walks.current()).toEqual([]);
  expect([...kv.items.keys()]).toEqual([]);
});

test('something kept that is not routes counts as none', async () => {
  const kv = memoryKv();
  kv.items.set('walks.routes', '{"oops":1}');
  expect((await createWalks({ kv })).current()).toEqual([]);
  kv.items.set('walks.routes', '[{"id":"1","name":"Gym","km":1.8},{"id":"2","name":5,"km":"x"}]');
  expect((await createWalks({ kv })).current()).toEqual([{ id: '1', name: 'Gym', km: 1.8 }]);
});
