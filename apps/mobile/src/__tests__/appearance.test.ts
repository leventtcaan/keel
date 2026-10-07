/**
 * The appearance choice (ADR-070 #3): Light, Dark or System, Light until the person picks; kept on the phone.
 */
import { createAppearance } from '@/theme/appearance';

function memoryKv(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}

test('nothing chosen yet: Light', async () => {
  const appearance = await createAppearance({ kv: memoryKv() });
  expect(appearance.current()).toBe('light');
});

test.each(['light', 'dark', 'system'] as const)('a kept %s choice is read at start', async (choice) => {
  const appearance = await createAppearance({ kv: memoryKv({ appearance: choice }) });
  expect(appearance.current()).toBe(choice);
});

test('a value this app does not know is not trusted: Light', async () => {
  const appearance = await createAppearance({ kv: memoryKv({ appearance: 'sepia' }) });
  expect(appearance.current()).toBe('light');
});

test('a choice is kept on the phone and heard by subscribers', async () => {
  const kv = memoryKv();
  const appearance = await createAppearance({ kv });
  const heard = jest.fn();
  appearance.subscribe(heard);
  await appearance.set('dark');
  expect(appearance.current()).toBe('dark');
  expect(kv.items.get('appearance')).toBe('dark');
  expect(heard).toHaveBeenCalledTimes(1);
});

test('choosing what is already chosen tells no one', async () => {
  const appearance = await createAppearance({ kv: memoryKv({ appearance: 'system' }) });
  const heard = jest.fn();
  appearance.subscribe(heard);
  await appearance.set('system');
  expect(heard).not.toHaveBeenCalled();
});

test('an unsubscribed listener hears nothing more', async () => {
  const appearance = await createAppearance({ kv: memoryKv() });
  const heard = jest.fn();
  const stop = appearance.subscribe(heard);
  stop();
  await appearance.set('dark');
  expect(heard).not.toHaveBeenCalled();
});

test('sign-out forgets the choice: the next person starts on Light', async () => {
  const kv = memoryKv({ appearance: 'dark' });
  const appearance = await createAppearance({ kv });
  const heard = jest.fn();
  appearance.subscribe(heard);
  await appearance.forget();
  expect(kv.items.has('appearance')).toBe(false);
  expect(appearance.current()).toBe('light');
  expect(heard).toHaveBeenCalledTimes(1);
});

test('a choice the phone could not keep changes nothing, and the caller hears why', async () => {
  const kv = { ...memoryKv(), setItemAsync: async () => Promise.reject(new Error('disk full')) };
  const appearance = await createAppearance({ kv });
  const heard = jest.fn();
  appearance.subscribe(heard);
  await expect(appearance.set('dark')).rejects.toThrow('disk full');
  expect(appearance.current()).toBe('light');
  expect(heard).not.toHaveBeenCalled();
});
