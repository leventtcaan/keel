/**
 * Finishing onboarding (K-312): the one profile PUT first — a failed save queues nothing, so a value corrected before the
 * retry is the one that goes — then the starting weight and waist to the queue, with ids made once for the draft
 * (ADR-024). Health answers only with the consent.
 */
import { type Draft, emptyDraft } from '@/onboarding/draft';
import { finishOnboarding } from '@/onboarding/finish';

const IDS = { weighIn: '11111111-1111-4111-8111-111111111111', waist: '22222222-2222-4222-8222-222222222222' };
const NOW = new Date('2026-09-30T21:30:00Z'); // already 1 October in Istanbul

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft,
    ids: IDS,
    goal: 'LOSE_FAT',
    experience: 'NEW',
    programChoice: 'BUILD_ONE_FOR_ME',
    trainingDays: ['MONDAY'],
    height: { cm: '178', feet: '', inches: '' },
    birthYear: '1994',
    sex: 'MALE',
    activityLevel: 'ACTIVE',
    healthConsent: 'granted',
    weight: '82.45',
    waist: '88.5',
    ...overrides,
  };
}

function fakes() {
  const calls: string[] = [];
  const queue = { record: jest.fn(async (record: { kind: string }) => (calls.push(`record ${record.kind}`), true)) };
  const profile = { save: jest.fn(async () => void calls.push('save')) };
  return { calls, queue, profile };
}

const run = (d: Draft, f: ReturnType<typeof fakes>, units: 'METRIC' | 'IMPERIAL' = 'METRIC') =>
  finishOnboarding({ draft: d, units, queue: f.queue, profile: f.profile, now: NOW, timeZone: 'Europe/Istanbul' });

test('with the consent: the profile is saved once, then the weight and the waist are queued', async () => {
  const f = fakes();
  await run(draft(), f);
  expect(f.calls).toEqual(['save', 'record weighIn', 'record waist']);
  expect(f.queue.record).toHaveBeenCalledWith({
    kind: 'weighIn',
    body: { clientId: IDS.weighIn, measuredAt: NOW.toISOString(), kg: 82.45, source: 'MANUAL' },
  });
  // The waist's day is the user's own calendar day.
  expect(f.queue.record).toHaveBeenCalledWith({ kind: 'waist', body: { clientId: IDS.waist, measuredOn: '2026-10-01', cm: 88.5 } });
});

test('imperial: the pounds and inches typed go as kilograms and centimetres, rounded once', async () => {
  const f = fakes();
  await run(draft({ height: { cm: '', feet: '5', inches: '10' }, weight: '180', waist: '34' }), f, 'IMPERIAL');
  expect(f.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 81.65 }) }));
  expect(f.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ cm: 86.4 }) }));
  expect(f.profile.save).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 178, units: 'IMPERIAL' }));
});

test('no waist typed: only the weight', async () => {
  const f = fakes();
  await run(draft({ waist: '' }), f);
  expect(f.calls).toEqual(['save', 'record weighIn']);
});

test('without the consent: nothing health is sent, whatever was typed before declining', async () => {
  const f = fakes();
  await run(draft({ healthConsent: 'declined', avoid: 'peanuts' }), f);
  expect(f.calls).toEqual(['save']);
  expect(f.profile.save).toHaveBeenCalledWith(expect.not.objectContaining({ food: expect.anything() }));
});

test('a failed save queues nothing: the value corrected before the retry is the one that goes', async () => {
  const f = fakes();
  f.profile.save.mockRejectedValueOnce(new Error('profile save failed with HTTP 503'));
  await expect(run(draft({ weight: '58' }), f)).rejects.toThrow('503');
  expect(f.queue.record).not.toHaveBeenCalled();
  await run(draft({ weight: '85' }), f);
  expect(f.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 85, clientId: IDS.weighIn }) }));
  expect(f.queue.record).toHaveBeenCalledTimes(2);
});

test('an incomplete draft throws before anything is saved or queued', async () => {
  for (const broken of [draft({ weight: '' }), draft({ waist: 'x' }), draft({ sex: null })]) {
    const f = fakes();
    await expect(run(broken, f)).rejects.toThrow();
    expect(f.calls).toEqual([]);
  }
});

test('a record the phone cannot keep (a broken local database) reaches the caller', async () => {
  const f = fakes();
  f.queue.record.mockRejectedValueOnce(new Error('database is locked'));
  await expect(run(draft(), f)).rejects.toThrow('database is locked');
});
