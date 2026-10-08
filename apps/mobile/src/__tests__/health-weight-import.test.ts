/**
 * Apple Health's older weigh-ins, brought in once (K-616, ADR-018 §3, ADR-053): a year back to where the regular read
 * begins — the two never read the same sample — marked IMPORT (seen in the trend, never read by the engine), each by its
 * Health id, only with both consents, only a weight a body can have.
 */
import type { HealthAccess, HealthWeight } from '@/health/health';
import { healthParams } from '@/health/params';
import { HEALTH_WEIGHT_READ_DAYS, importHealthWeights } from '@/health/weightSync';

const DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-10-04T09:00:00Z');
const OLD: HealthWeight = { id: 'B1C2D3E4-0000-4000-8000-00000000000A', at: '2026-03-02T06:40:00.000Z', kg: 88.1249 };

function health(weights: HealthWeight[], available = true) {
  const asked: { from: Date; to: Date }[] = [];
  const access: HealthAccess = {
    available,
    requestRead: async () => {},
    readWeights: async (from, to) => (asked.push({ from, to }), weights),
    readDailyTotals: async () => [],
    readSleep: async () => [],
    readWatchActiveEnergy: async () => undefined,
    readCardioWorkouts: async () => [],
  };
  return { access, asked };
}
function queue(isNew = true) {
  const records: unknown[] = [];
  return { records, record: jest.fn(async (record: unknown) => (records.push(record), isNew)), drain: jest.fn(async () => {}) };
}

test('a year back, ending where the regular read begins: each weigh-in marked IMPORT, by its Health id, sent in the background', async () => {
  const h = health([OLD]);
  const q = queue();

  const added = await importHealthWeights({ health: h.access, queue: q, consented: async () => true, now: NOW });

  expect(added).toBe(1);
  expect(q.records).toEqual([
    { kind: 'weighIn', body: { clientId: 'b1c2d3e4-0000-4000-8000-00000000000a', measuredAt: OLD.at, kg: 88.12, source: 'IMPORT' } },
  ]);
  // Not waited for: the queue sends a year of them in the background (K-616 review — a minute-long tap otherwise).
  expect(q.drain).not.toHaveBeenCalled();
  expect(h.asked).toHaveLength(1);
  expect(NOW.getTime() - h.asked[0].from.getTime()).toBe(healthParams.weightImportDays * DAY);
  expect(NOW.getTime() - h.asked[0].to.getTime()).toBe(HEALTH_WEIGHT_READ_DAYS * DAY);
});

test('the import reaches further back than the regular read', () => {
  expect(healthParams.weightImportDays).toBeGreaterThan(HEALTH_WEIGHT_READ_DAYS);
});

test('without both consents nothing is read and nothing kept, and it says so (ADR-030 #25)', async () => {
  const h = health([OLD]);
  const q = queue();

  expect(await importHealthWeights({ health: h.access, queue: q, consented: async () => false, now: NOW })).toBe('consent');
  expect(h.asked).toEqual([]);
  expect(q.record).not.toHaveBeenCalled();
});

test('where Apple Health is not available, nothing is asked', async () => {
  const q = queue();
  const consented = jest.fn(async () => true);

  expect(await importHealthWeights({ health: health([OLD], false).access, queue: q, consented, now: NOW })).toBe(0);
  expect(consented).not.toHaveBeenCalled();
});

test('a weight no body could have is left out; one already on the phone is not counted again', async () => {
  const q = queue(false);
  const weights = [
    { ...OLD, id: 'B1C2D3E4-0000-4000-8000-00000000000B', kg: 0 },
    { ...OLD, id: 'B1C2D3E4-0000-4000-8000-00000000000C', kg: 900 },
    OLD,
  ];

  expect(await importHealthWeights({ health: health(weights).access, queue: q, consented: async () => true, now: NOW })).toBe(0);
  expect(q.record).toHaveBeenCalledTimes(1);
  expect(q.drain).not.toHaveBeenCalled();
});
