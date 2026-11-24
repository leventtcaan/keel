/**
 * The rest taken before a set (K-1214): from the set logged to Ready, kept on the next set. Never negative; none for a
 * move's first set, after a pause, or when it cannot be believed.
 */
import { buildSet } from '@/train/session';
import { readySpan, restSecondsOf, startSpan } from '@/train/restRecord';
import { workoutParams } from '@/train/params';

const MAX = workoutParams.restRecordMaxSeconds;

test('the seconds from the start of the rest to Ready, whole', () => {
  const span = readySpan(startSpan(10_000), 10_000 + 134_600);
  expect(restSecondsOf(span, 999_999_999, MAX)).toBe(135);
});

test('no Ready: the rest is read as of the set being logged', () => {
  expect(restSecondsOf(startSpan(1_000), 1_000 + 95_000, MAX)).toBe(95);
});

test('no rest, no seconds: the first set of a move, or a rest a pause or a skip voided (the span is gone)', () => {
  expect(restSecondsOf(null, 5_000, MAX)).toBeNull();
  expect(readySpan(null, 5_000)).toBeNull();
});

test('Ready is said once: the first moment stands', () => {
  const span = readySpan(startSpan(0), 60_000);
  expect(readySpan(span, 500_000)).toBe(span);
});

test('a clock that went back, or a break longer than the ceiling, is no rest', () => {
  expect(restSecondsOf(startSpan(50_000), 40_000, MAX)).toBeNull();
  expect(restSecondsOf(startSpan(0), (MAX + 1) * 1000, MAX)).toBeNull();
  expect(restSecondsOf(startSpan(0), MAX * 1000, MAX)).toBe(MAX);
  expect(restSecondsOf(startSpan(NaN), 1, MAX)).toBeNull();
});

test('property: whatever the moments, the answer is null or a whole number from 0 to the ceiling', () => {
  // A seeded generator: the same cases every run.
  let seed = 1214;
  const next = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 2000; i += 1) {
    const since = Math.floor(next() * 2e9) - 1e9;
    const now = since + Math.floor((next() - 0.3) * 3e7);
    const ready = next() < 0.5 ? null : since + Math.floor((next() - 0.3) * 3e7);
    const span = ready === null ? startSpan(since) : readySpan(startSpan(since), ready);
    const seconds = restSecondsOf(span, now, MAX);
    if (seconds !== null) {
      expect(Number.isInteger(seconds)).toBe(true);
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThanOrEqual(MAX);
    }
  }
});

describe('on the set', () => {
  const move = { id: 'bench_press' } as Parameters<typeof buildSet>[1];
  const entry = { loadKg: 60, reps: 8 } as Parameters<typeof buildSet>[3];

  test('a rest is sent; none is left out, as an older phone sent', () => {
    expect(buildSet('c1', move, 'BOTH', entry, 1, undefined, undefined, 135)).toMatchObject({ restSeconds: 135 });
    expect(buildSet('c1', move, 'BOTH', entry, 1, undefined, undefined, 0)).toMatchObject({ restSeconds: 0 });
    expect(buildSet('c1', move, 'BOTH', entry, 1, undefined, undefined, null)).not.toHaveProperty('restSeconds');
    expect(buildSet('c1', move, 'BOTH', entry, 1)).not.toHaveProperty('restSeconds');
  });
});
