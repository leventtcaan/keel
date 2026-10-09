/**
 * The call screen's face (K-978, ADR-077 #3): what its foot says and which second way it offers, read from what the server
 * said (Application.state, Decision.declinable). "Keep last week's plan" only where the server allows it (never on a call
 * resting on the safety net, U13); "Use this call" on a call not in the plan; a past call, nothing to tap.
 */
import type { components } from '@/api/schema';
import { callFace, declineCall } from '@/today/call';

type Schemas = components['schemas'];
const call = (state: Schemas['Application']['state'], declinable = false): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-28',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [{ rule: 'plateau', source: { tag: 'EXPERIENCE' } }],
  confidence: 'MEDIUM',
  nextReview: '2027-01-04',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state },
  declinable,
});

test('in the plan: "In this week\'s plan"; the server allowing it, "Keep last week\'s plan"', () => {
  expect(callFace(call('APPLIED', true), false)).toEqual({ foot: 'inPlan', second: 'keep' });
  expect(callFace(call('APPLIED', false), false)).toEqual({ foot: 'inPlan', second: null }); // a safety call: no second way
});

test('declined: "Not applied", and "Use this call"; not in the plan yet: "Use this call" too', () => {
  expect(callFace(call('DECLINED'), false)).toEqual({ foot: 'notApplied', second: 'use' });
  expect(callFace(call('PENDING', true), false)).toEqual({ foot: null, second: 'use' });
});

test('undone, or a call that changes nothing: its words only', () => {
  expect(callFace(call('UNDONE'), false)).toEqual({ foot: 'undone', second: null });
  expect(callFace(call('NOT_NEEDED'), false)).toEqual({ foot: null, second: null });
});

test('a past call, read only: the foot, never a way to change it', () => {
  expect(callFace(call('APPLIED', true), true)).toEqual({ foot: 'inPlan', second: null });
  expect(callFace(call('DECLINED'), true)).toEqual({ foot: 'notApplied', second: null });
});

describe('declining', () => {
  const answer = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

  test('sent once; the targets back as the answer', async () => {
    const POST = jest.fn(async (_path: string, _init?: unknown) => answer(200, { stepsPerDay: 8000, trainingSessionsPerWeek: 3 }));
    await declineCall({ POST } as never, 'd1');
    expect(POST).toHaveBeenCalledWith('/v1/decisions/{id}/decline', { params: { path: { id: 'd1' } } });
  });

  test.each([
    [409, 'DeclineRefused'],
    [500, 'DeclineFailed'],
  ])('refused %i: %s', async (status, name) => {
    const POST = jest.fn(async () => answer(status));
    await expect(declineCall({ POST } as never, 'd1')).rejects.toMatchObject({ name });
  });

  test('no answer: NoConnection', async () => {
    const POST = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(declineCall({ POST } as never, 'd1')).rejects.toMatchObject({ name: 'NoConnection' });
  });
});
