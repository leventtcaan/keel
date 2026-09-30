/**
 * Finishing onboarding (K-312): the starting weight and waist go to the queue with ids made once, so a retry after a
 * failed save sends the same records (ADR-024); then the one profile PUT. Health answers only with the consent.
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
    programChoice: 'BUILD_ONE_FOR_ME',
    trainingDays: ['MONDAY'],
    sessionsLastMonth: 'FOUR',
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

test('with the consent: the weight and the waist are queued first, then the profile is saved once', async () => {
  const f = fakes();
  await run(draft(), f);
  expect(f.calls).toEqual(['record weighIn', 'record waist', 'save']);
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
  expect(f.calls).toEqual(['record weighIn', 'save']);
});

test('without the consent: nothing health is sent, whatever was typed before declining', async () => {
  const f = fakes();
  await run(draft({ healthConsent: 'declined', avoid: 'peanuts' }), f);
  expect(f.calls).toEqual(['save']);
  expect(f.profile.save).toHaveBeenCalledWith(expect.not.objectContaining({ food: expect.anything() }));
});

test('a retry after a failed save queues the same records, by the same ids', async () => {
  const f = fakes();
  f.profile.save.mockRejectedValueOnce(new Error('profile save failed with HTTP 503'));
  await expect(run(draft(), f)).rejects.toThrow('503');
  await run(draft(), f);
  const ids = f.queue.record.mock.calls.map(([record]) => (record as unknown as { body: { clientId: string } }).body.clientId);
  expect(ids).toEqual([IDS.weighIn, IDS.waist, IDS.weighIn, IDS.waist]);
  expect(f.profile.save).toHaveBeenCalledTimes(2);
});
