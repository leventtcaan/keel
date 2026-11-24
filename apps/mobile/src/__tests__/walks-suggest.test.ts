/**
 * The steps left as a walk the user knows (K-1216). Deterministic and with no location: the remaining steps are the engine's target
 * less today's count (U1); a route is a distance the user typed. Nothing here scolds (U7) and nothing reads where the phone is.
 */
import { kmFromInput, formatDistance, KM_PER_MI } from '@/walks/distance';
import { walkParams as W } from '@/walks/params';
import { stepsPerKm, suggestWalk, type WalkRoute } from '@/walks/suggest';

const route = (id: string, name: string, km: number): WalkRoute => ({ id, name, km });
const SPK = 1400;

describe('distance, in the user\'s unit', () => {
  test('km is taken as typed, miles are converted once to km', () => {
    expect(kmFromInput('1.8', 'METRIC')).toBe(1.8);
    expect(kmFromInput('1,8', 'METRIC')).toBe(1.8);
    expect(kmFromInput('1', 'IMPERIAL')).toBe(1.609);
    expect(KM_PER_MI).toBe(1.609344);
  });

  test('a distance that is not a positive number inside the limit is none', () => {
    for (const text of ['', 'abc', '0', '-1', '0.01', String(W.routeMaxKm + 1), '1.2.3']) expect(kmFromInput(text, 'METRIC')).toBeNull();
  });

  test('shown back in the unit, one decimal; a mile typed is a mile shown', () => {
    expect(formatDistance(1.8, 'METRIC')).toBe('1.8 km');
    expect(formatDistance(kmFromInput('1.2', 'IMPERIAL') ?? 0, 'IMPERIAL')).toBe('1.2 mi');
    expect(formatDistance(2, 'METRIC')).toBe('2 km');
  });
});

describe('steps in a km', () => {
  test('from the height: 1000 / (factor x height)', () => {
    expect(stepsPerKm(170)).toBe(Math.round(1000 / (W.strideHeightFactor * 1.7)));
    expect(stepsPerKm(190)).toBeLessThan(stepsPerKm(160));
  });

  test('without a usable height: the parameter default', () => {
    for (const height of [null, undefined, 0, -3, 20, 400, Number.NaN]) expect(stepsPerKm(height)).toBe(W.stepsPerKmDefault);
  });
});

describe('the suggestion', () => {
  test('nothing when nothing is left, or too little to name', () => {
    const routes = [route('1', 'Gym', 1.8)];
    for (const remaining of [0, -10, W.minRemainingSteps - 1, Number.NaN]) expect(suggestWalk({ remaining, routes, stepsPerKm: SPK })).toBeNull();
  });

  test('the route whose round trip covers the gap with the least overshoot', () => {
    const routes = [route('a', 'Park', 0.5), route('b', 'Gym', 1.8), route('c', 'Work', 2.5)];
    // 1.8 km each way = 3.6 km = 5,040 steps; 2.5 km = 7,000; 0.5 km = 1,400.
    const got = suggestWalk({ remaining: 4000, routes, stepsPerKm: SPK });
    expect(got).toEqual({ kind: 'route', route: routes[1], roundTripSteps: 5040, minutes: Math.round(4000 / W.cadence) });
  });

  test('a route that is too short is not enough: minutes only', () => {
    const got = suggestWalk({ remaining: 4000, routes: [route('a', 'Park', 0.5)], stepsPerKm: SPK });
    expect(got).toEqual({ kind: 'minutes', minutes: Math.round(4000 / W.cadence) });
  });

  test('a route far longer than the gap is not suggested either (the overshoot limit)', () => {
    const got = suggestWalk({ remaining: 800, routes: [route('a', 'Work', 2.5)], stepsPerKm: SPK });
    expect(got?.kind).toBe('minutes');
  });

  test('no routes: minutes only, from the cadence', () => {
    expect(suggestWalk({ remaining: 3500, routes: [], stepsPerKm: SPK })).toEqual({ kind: 'minutes', minutes: Math.round(3500 / W.cadence) });
  });

  test('properties over many gaps and routes: never when nothing is left; a route always covers the gap within the limit; minutes at least one', () => {
    let seed = 12345;
    const next = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let i = 0; i < 2000; i += 1) {
      const remaining = Math.floor(next() * 14000) - 2000;
      const routes = Array.from({ length: Math.floor(next() * 4) }, (_, k) => route(String(k), `R${k}`, Math.round((0.1 + next() * 6) * 10) / 10));
      const spk = 1000 + Math.floor(next() * 800);
      const got = suggestWalk({ remaining, routes, stepsPerKm: spk });
      if (remaining < W.minRemainingSteps) {
        expect(got).toBeNull();
        continue;
      }
      expect(got).not.toBeNull();
      if (got?.kind === 'route') {
        expect(got.roundTripSteps).toBeGreaterThanOrEqual(remaining);
        expect(got.roundTripSteps).toBeLessThanOrEqual(remaining * W.maxOvershoot);
        const better = routes.filter((r) => Math.round(2 * r.km * spk) >= remaining && Math.round(2 * r.km * spk) < got.roundTripSteps);
        expect(better).toEqual([]);
      } else {
        expect(got?.minutes).toBeGreaterThanOrEqual(1);
        const fits = routes.some((r) => Math.round(2 * r.km * spk) >= remaining && Math.round(2 * r.km * spk) <= remaining * W.maxOvershoot);
        expect(fits).toBe(false);
      }
    }
  });
});
