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
  const seen = (kg: number, adherence = 0.8): Seen => ({ adherence, kg, low: kg - 3.5, high: kg + 3.4 });

  test('nothing to say the first time, or when the middle number barely moved (the scale\'s noise)', () => {
    expect(updateNote(null, seen(84), 'LOSS')).toBeNull();
    expect(updateNote(seen(84), seen(84), 'LOSS')).toBeNull();
    expect(updateNote(seen(84), seen(84.4), 'LOSS')).toBeNull();
    expect(updateNote(seen(84), seen(83.6), 'LOSS')).toBeNull();
  });

  test('judged by the middle number: a cut that moved up is "away", one that moved down is not', () => {
    expect(updateNote(seen(84), seen(85), 'LOSS')).toEqual({ from: seen(84), to: seen(85), away: true });
    expect(updateNote(seen(84), seen(83), 'LOSS')?.away).toBe(false);
    // The high end clamped at today's weight does not hide a move away (review finding).
    const clamped = (kg: number): Seen => ({ adherence: 0.8, kg, low: kg - 3.5, high: 90 });
    expect(updateNote(clamped(86), clamped(87), 'LOSS')?.away).toBe(true);
  });

  test('a bulk whose middle moved down is "away"', () => {
    expect(updateNote(seen(70), seen(69), 'GAIN')?.away).toBe(true);
    expect(updateNote(seen(70), seen(71), 'GAIN')?.away).toBe(false);
  });

  test('another scenario is not compared: 95 % against 80 % says nothing', () => {
    expect(updateNote(seen(84, 0.8), seen(86, 0.95), 'LOSS')).toBeNull();
  });
});

const SEEN: Seen = { adherence: 0.8, kg: 81, low: 78, high: 84 };

describe('the switch', () => {
  test('off unless turned on', async () => {
    const kv = memoryKv();
    const toggle = await createProjectionSwitch({ kv, access: await createProjectionAccess({ kv, locale: 'en-US' }) });
    expect(toggle.on()).toBe(false);
  });

  test('a kept "on" without the gate\'s "clear" reads as off (review finding: a sign-out cut short)', async () => {
    for (const gate of [null, 'unavailable']) {
      const kv = memoryKv(new Map([['projection.on', 'true'], ...(gate === null ? [] : [['projection.access', gate] as [string, string]])]));
      const toggle = await createProjectionSwitch({ kv, access: await createProjectionAccess({ kv, locale: 'en-US' }) });
      expect(toggle.on()).toBe(false);
    }
  });

  test('turns on only once the SCOFF gate says clear', async () => {
    const kv = memoryKv();
    const access = await createProjectionAccess({ kv, locale: 'en-US' });
    const toggle = await createProjectionSwitch({ kv, access });

    expect(await toggle.turnOn()).toBe(false); // not asked yet
    await access.record('unavailable');
    expect(await toggle.turnOn()).toBe(false);
    expect(toggle.on()).toBe(false);

    const other = memoryKv();
    const clear = await createProjectionAccess({ kv: other, locale: 'en-US' });
    await clear.record('clear');
    const otherToggle = await createProjectionSwitch({ kv: other, access: clear });
    expect(await otherToggle.turnOn()).toBe(true);
    expect((await createProjectionSwitch({ kv: other, access: clear })).on()).toBe(true);
  });

  test('off forgets what was shown; so does sign-out', async () => {
    const kv = memoryKv(new Map([['projection.access', 'clear']]));
    const access = await createProjectionAccess({ kv, locale: 'en-US' });
    const toggle = await createProjectionSwitch({ kv, access });
    await toggle.turnOn();
    await toggle.remember(SEEN);
    expect(toggle.lastSeen()).toEqual(SEEN);

    await toggle.turnOff();
    expect(toggle.on()).toBe(false);
    expect(toggle.lastSeen()).toBeNull();
    expect([...kv.stored.keys()]).toEqual(['projection.access']);

    await toggle.turnOn();
    await toggle.remember(SEEN);
    await toggle.forget();
    expect(toggle.on()).toBe(false);
    expect(toggle.lastSeen()).toBeNull();
  });

  test('a kept "last seen" that is not four numbers is read as none', async () => {
    const kv = memoryKv(new Map([['projection.access', 'clear'], ['projection.on', 'true'], ['projection.last', '{"low":"x"}']]));
    const access = await createProjectionAccess({ kv, locale: 'en-US' });
    expect((await createProjectionSwitch({ kv, access })).lastSeen()).toBeNull();
  });
});
