/**
 * The rest the timer aims for (K-1214): the recommended band (G1 K-49), or the user's own value per kind; kept on the phone.
 */
import { workoutParams } from '@/train/params';
import { bandFor, clampCustom, createRestPreference, defaultChoice, recommendedBand } from '@/train/restBand';
import { bandText } from '@/train/session';

function memoryKv(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
}

test('the recommended band is the parameters: 2-3 minutes for every kind of move', () => {
  expect(recommendedBand()).toEqual({ low: workoutParams.restSecondsMin, high: workoutParams.restSecondsMax });
  const choice = defaultChoice();
  expect(bandFor('COMPOUND', choice)).toEqual(recommendedBand());
  expect(bandFor('ISOLATION', choice)).toEqual(recommendedBand());
  expect(bandFor(undefined, choice)).toEqual(recommendedBand());
  expect(bandText(workoutParams.restSecondsMin, workoutParams.restSecondsMax)).toBe('2-3 min');
});

test('a fixed value per kind: no upper end; a move of no known kind keeps the band', () => {
  const choice = { mode: 'CUSTOM' as const, custom: { COMPOUND: 150, ISOLATION: 75 } };
  expect(bandFor('COMPOUND', choice)).toEqual({ low: 150, high: null });
  expect(bandFor('ISOLATION', choice)).toEqual({ low: 75, high: null });
  expect(bandFor(undefined, choice)).toEqual(recommendedBand());
});

test('a value is held within the stepper bounds', () => {
  expect(clampCustom(1)).toBe(workoutParams.restCustomMinSeconds);
  expect(clampCustom(99_999)).toBe(workoutParams.restCustomMaxSeconds);
  expect(clampCustom(100)).toBe(100);
});

test('a band that is not whole minutes is said exactly', () => {
  expect(bandText(105, 165)).toBe('1:45-2:45');
});

test('nothing kept: the recommended band; a choice is kept, read again, and forgotten at sign-out', async () => {
  const kv = memoryKv();
  const rest = await createRestPreference({ kv });
  expect(rest.current().mode).toBe('RECOMMENDED');
  const seen = jest.fn();
  rest.subscribe(seen);
  await rest.set({ mode: 'CUSTOM', custom: { COMPOUND: 135, ISOLATION: 90 } });
  expect(seen).toHaveBeenCalledTimes(1);
  expect((await createRestPreference({ kv })).current()).toEqual({ mode: 'CUSTOM', custom: { COMPOUND: 135, ISOLATION: 90 } });
  await rest.forget();
  expect(rest.current().mode).toBe('RECOMMENDED');
  expect(kv.items.size).toBe(0);
});

test.each(['not json', '{"mode":"SEPIA"}', '{"mode":"CUSTOM","custom":{"COMPOUND":"x","ISOLATION":60}}', 'null'])('what cannot be read (%s) is not trusted: the recommended band', async (kept) => {
  const rest = await createRestPreference({ kv: memoryKv({ 'train.rest': kept }) });
  expect(rest.current()).toEqual(defaultChoice());
});

test('a kept value out of bounds is held within them', async () => {
  const rest = await createRestPreference({ kv: memoryKv({ 'train.rest': '{"mode":"CUSTOM","custom":{"COMPOUND":5,"ISOLATION":90000}}' }) });
  expect(rest.current().custom).toEqual({ COMPOUND: workoutParams.restCustomMinSeconds, ISOLATION: workoutParams.restCustomMaxSeconds });
});
