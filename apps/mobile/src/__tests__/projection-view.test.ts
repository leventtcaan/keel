/**
 * The shape projection on the phone (K-606, U12, ADR-052): the server gives the numbers; the phone draws a faceless figure only
 * toward the goal, says an update without blame, and keeps the switch off unless the person turns it on after the SCOFF
 * gate (ADR-050). Turning it off forgets what was shown.
 */
import { createProjectionAccess } from '@/projection/scoff';
import { type Seen, createProjectionSwitch, updateNote, widthFactor } from '@/projection/projection';

function memoryKv(stored = new Map<string, string>()) {
  return {
    stored,
    getItemAsync: async (key: string) => stored.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      stored.set(key, value);
    },
    removeItemAsync: async (key: string) => stored.delete(key),
  };
}

describe('the figure only ever goes toward the goal', () => {
  test('width follows the square root of the weight at the same height', () => {
    expect(widthFactor(100, 81, 'LOSS')).toBeCloseTo(0.9, 6);
    expect(widthFactor(64, 81, 'GAIN')).toBeCloseTo(1.125, 6);
  });

  test('a losing projection is never drawn wider, a gaining one never narrower', () => {
    expect(widthFactor(90, 91, 'LOSS')).toBe(1);
    expect(widthFactor(90, 89, 'GAIN')).toBe(1);
    for (let kg = 40; kg <= 160; kg += 0.5) {
      expect(widthFactor(90, kg, 'LOSS')).toBeLessThanOrEqual(1);
      expect(widthFactor(90, kg, 'GAIN')).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('an update is said without blame', () => {
  const seen = (low: number, high: number): Seen => ({ low, high });

  test('nothing to say the first time, or when nothing moved', () => {
    expect(updateNote(null, seen(78, 84), 'LOSS')).toBeNull();
    expect(updateNote(seen(78, 84), seen(78, 84), 'LOSS')).toBeNull();
  });

  test('a cut whose range moved up is "away", one that moved down is not', () => {
    expect(updateNote(seen(78, 84), seen(79, 85), 'LOSS')).toEqual({ from: seen(78, 84), to: seen(79, 85), away: true });
    expect(updateNote(seen(78, 84), seen(77.5, 83), 'LOSS')).toEqual({ from: seen(78, 84), to: seen(77.5, 83), away: false });
  });

  test('a bulk whose range moved down is "away"', () => {
    expect(updateNote(seen(70, 74), seen(69, 73), 'GAIN')?.away).toBe(true);
    expect(updateNote(seen(70, 74), seen(71, 75), 'GAIN')?.away).toBe(false);
  });
});

describe('the switch', () => {
  test('off unless turned on', async () => {
    const kv = memoryKv();
    const toggle = await createProjectionSwitch({ kv });
    expect(toggle.on()).toBe(false);
  });

  test('turns on only once the SCOFF gate says clear', async () => {
    const kv = memoryKv();
    const toggle = await createProjectionSwitch({ kv });
    const access = await createProjectionAccess({ kv, locale: 'en-US' });

    expect(await toggle.turnOn(access)).toBe(false); // not asked yet
    await access.record('unavailable');
    expect(await toggle.turnOn(access)).toBe(false);
    expect(toggle.on()).toBe(false);

    const other = memoryKv();
    const clear = await createProjectionAccess({ kv: other, locale: 'en-US' });
    await clear.record('clear');
    const otherToggle = await createProjectionSwitch({ kv: other });
    expect(await otherToggle.turnOn(clear)).toBe(true);
    expect((await createProjectionSwitch({ kv: other })).on()).toBe(true);
  });

  test('off forgets what was shown; so does sign-out', async () => {
    const kv = memoryKv(new Map([['projection.access', 'clear']]));
    const access = await createProjectionAccess({ kv, locale: 'en-US' });
    const toggle = await createProjectionSwitch({ kv });
    await toggle.turnOn(access);
    await toggle.remember({ low: 78, high: 84 });
    expect(toggle.lastSeen()).toEqual({ low: 78, high: 84 });

    await toggle.turnOff();
    expect(toggle.on()).toBe(false);
    expect(toggle.lastSeen()).toBeNull();
    expect([...kv.stored.keys()]).toEqual(['projection.access']);

    await toggle.turnOn(access);
    await toggle.remember({ low: 78, high: 84 });
    await toggle.forget();
    expect(toggle.on()).toBe(false);
    expect(toggle.lastSeen()).toBeNull();
  });

  test('a kept "last seen" that is not two numbers is read as none', async () => {
    const kv = memoryKv(new Map([['projection.on', 'true'], ['projection.last', '{"low":"x"}']]));
    expect((await createProjectionSwitch({ kv })).lastSeen()).toBeNull();
  });
});
