/**
 * Weigh-ins from a smart scale through Apple Health (K-402, ADR-018): read only with both consents — health data (to keep
 * them) and Apple Health (to read) — each sample recorded once, by its Health id, and only a weight a body can have.
 * Nothing is kept on the phone without the consent (ADR-030 #25).
 */
import type { HealthAccess, HealthWeight } from '@/health/health';
import { HEALTH_WEIGHT_READ_DAYS, syncHealthWeights } from '@/health/weightSync';
import { onboardingParams } from '@/onboarding/params';

const NOW = new Date('2026-10-01T09:00:00Z');
const SAMPLE: HealthWeight = { id: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F', at: '2026-10-01T05:12:00.000Z', kg: 81.4359 };

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
function queue() {
  const records: unknown[] = [];
  return { records, record: jest.fn(async (record: unknown) => (records.push(record), true)), drain: jest.fn(async () => {}) };
}

test('with both consents: each scale weigh-in recorded once, by its Health id, rounded to what the server keeps', async () => {
  const h = health([SAMPLE]);
  const q = queue();

  const added = await syncHealthWeights({ health: h.access, queue: q, consented: async () => true, now: NOW });

  expect(added).toBe(1);
  expect(q.records).toEqual([
    { kind: 'weighIn', body: { clientId: 'e621e1f8-c36c-495a-93fc-0c247a3e6e5f', measuredAt: SAMPLE.at, kg: 81.44, source: 'APPLE_HEALTH' } },
  ]);
  expect(q.drain).toHaveBeenCalledTimes(1);
  expect(h.asked[0].to).toEqual(NOW);
  expect(NOW.getTime() - h.asked[0].from.getTime()).toBe(HEALTH_WEIGHT_READ_DAYS * 24 * 3600 * 1000);
});

test('without both consents nothing is read and nothing kept (ADR-030 #25)', async () => {
  const h = health([SAMPLE]);
  const q = queue();

  expect(await syncHealthWeights({ health: h.access, queue: q, consented: async () => false, now: NOW })).toBe(0);
  expect(h.asked).toEqual([]);
  expect(q.record).not.toHaveBeenCalled();
});

test('where Apple Health is not available, nothing is asked', async () => {
  const q = queue();
  const consented = jest.fn(async () => true);
  expect(await syncHealthWeights({ health: health([SAMPLE], false).access, queue: q, consented, now: NOW })).toBe(0);
  expect(consented).not.toHaveBeenCalled();
});

test('a weight no body could have is left out, not sent to be refused', async () => {
  const q = queue();
  const weights = [
    { ...SAMPLE, id: 'A0000000-0000-4000-8000-000000000001', kg: 0 },
    { ...SAMPLE, id: 'A0000000-0000-4000-8000-000000000002', kg: 900 },
  ];
  expect(await syncHealthWeights({ health: health(weights).access, queue: q, consented: async () => true, now: NOW })).toBe(0);
  expect(q.drain).not.toHaveBeenCalled();
});

test('read again, a sample already on the phone is not counted again (the queue keeps a clientId once)', async () => {
  const q = { ...queue(), record: jest.fn(async () => false) };
  expect(await syncHealthWeights({ health: health([SAMPLE]).access, queue: q, consented: async () => true, now: NOW })).toBe(0);
  expect(q.drain).not.toHaveBeenCalled();
});

test('the heaviest weight a body may have is kept; over it is not', async () => {
  const q = queue();
  const weights = [
    { ...SAMPLE, id: 'A0000000-0000-4000-8000-000000000003', kg: onboardingParams.weighInMaxKg },
    { ...SAMPLE, id: 'A0000000-0000-4000-8000-000000000004', kg: onboardingParams.weighInMaxKg + 0.01 },
  ];
  expect(await syncHealthWeights({ health: health(weights).access, queue: q, consented: async () => true, now: NOW })).toBe(1);
});
