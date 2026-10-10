/**
 * What the Today screen reads (K-401): each part from its own endpoint, each with its own state — ready, none yet (404),
 * consent missing (403 CONSENT_REQUIRED) or failed — so one part missing never blanks the others. The client computes
 * nothing the server decides (K-420: the consistency; K-212: the call).
 */
import { type TodayData, chips, labelKey, load, loadToday, programToday, reasonLines } from '@/today/today';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];
const ok = (data: unknown, status = 200) => ({
  data,
  response: new Response(null, { status }),
});
const error = (status: number, code: string) => ({
  error: { code, message: 'x' },
  response: new Response(null, { status }),
});

const DECISION: Schemas['Decision'] = {
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'CONTINUE' } as Schemas['Decision']['action'],
  reasons: [
    {
      rule: 'toward_goal',
      source: { tag: 'EXPERIENCE' },
    },
    {
      rule: 'no_such_rule',
      source: { tag: 'LITERATURE' },
    },
  ],
  confidence: 'HIGH',
  nextReview: '2026-10-05',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
  declinable: false,
  changes: [],
};

const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'TUESDAY', exercises: [] },
    { id: 'b', nameKey: 'programDays.lower_a.name', weekday: 'THURSDAY', exercises: [] },
  ],
};

describe('load', () => {
  test('an answer is ready; 404 is none yet; CONSENT_REQUIRED asks for the consent; anything else failed', async () => {
    expect(await load(async () => ok({ a: 1 }))).toEqual({
      state: 'ready',
      value: { a: 1 },
    });
    expect(await load(async () => error(404, 'NOT_FOUND'))).toEqual({
      state: 'none',
    });
    expect(await load(async () => error(403, 'CONSENT_REQUIRED'))).toEqual({
      state: 'consent',
    });
    expect(await load(async () => error(500, 'INTERNAL'))).toEqual({
      state: 'failed',
      problem: 'ServerError',
    });
    expect(await load(async () => error(403, 'FORBIDDEN'))).toEqual({
      state: 'failed',
      problem: 'ServerError',
    });
  });

  test('no answer at all is the connection', async () => {
    expect(
      await load(async () => {
        throw new TypeError('Network request failed');
      }),
    ).toEqual({ state: 'failed', problem: 'NoConnection' });
  });
});

describe('loadToday', () => {
  test("each part from its own endpoint, today's weigh-ins for today only", async () => {
    const GET = jest.fn(async (path: string, _init?: unknown) => {
      if (path === '/v1/consistency') return error(404, 'NOT_FOUND');
      if (path === '/v1/weigh-ins') return ok([]);
      return error(403, 'CONSENT_REQUIRED');
    });

    const today = await loadToday({ GET } as never, '2026-10-01');

    expect(today.consistency).toEqual({ state: 'none' });
    expect(today.weighIns).toEqual({ state: 'ready', value: [] });
    expect(today.decision).toEqual({ state: 'consent' });
    expect(GET).toHaveBeenCalledWith('/v1/weigh-ins', {
      params: { query: { from: '2026-10-01', to: '2026-10-01' } },
    });
    expect(GET).toHaveBeenCalledWith('/v1/days/{day}/budget', { params: { path: { day: '2026-10-01' } } });
    expect(GET.mock.calls.map(([path]) => path).sort()).toEqual(
      // K-501 adds the check-in, K-518 the state, K-520 the coach's questions (K1 note to the product owner: the list grows by the part
      // each task adds).
      ['/v1/check-ins/current', '/v1/consistency', '/v1/days/{day}/budget', '/v1/decisions/current', '/v1/first-weeks', '/v1/program', '/v1/prompts', '/v1/state',
        '/v1/targets', '/v1/weigh-ins'].sort(),
    );
  });
});

describe('programToday', () => {
  test("the program's day on today's weekday; another weekday is a rest day; a week off is a rest week", () => {
    expect(programToday(PROGRAM, '2026-09-29')).toEqual({
      kind: 'session',
      day: PROGRAM.days[0],
    }); // a Tuesday
    expect(programToday(PROGRAM, '2026-09-30')).toEqual({ kind: 'rest' }); // a Wednesday
    expect(programToday({ ...PROGRAM, restUntil: '2026-10-04' }, '2026-09-29')).toEqual({ kind: 'restWeek' });
    expect(programToday({ ...PROGRAM, restUntil: '2026-09-28' }, '2026-09-29')).toEqual({ kind: 'session', day: PROGRAM.days[0] });
  });
});

describe('the call', () => {
  test("the label is the action's, from the copy key", () => {
    expect(labelKey('decision.continue.toward_goal')).toBe('decision.continue.label');
    expect(labelKey('decision.no_decision_yet.cycle_check_needed')).toBe('decision.no_decision_yet.label');
  });

  test("each reason in its own sentence where the copy has one — the leading one too (K-522) — and always its kind of source (U14)", () => {
    expect(reasonLines(DECISION)).toEqual([
      { sentenceKey: 'decision.rule.toward_goal', tag: 'EXPERIENCE' },
      { sentenceKey: null, tag: 'LITERATURE' },
    ]);
  });

  test('a safety call says nothing of why: its kinds of source, no sentence (ADR-028 #24)', () => {
    expect(reasonLines({ ...DECISION, safety: true, reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' } }] })).toEqual([
      { sentenceKey: null, tag: 'LITERATURE' },
    ]);
  });
});

describe('chips', () => {
  const nothing: TodayData = {
    consistency: { state: 'none' },
    decision: { state: 'none' },
    program: { state: 'none' },
    weighIns: { state: 'ready', value: [] },
    targets: { state: 'none' },
    budget: { state: 'none' },
  };

  test("they come from the day's data", () => {
    const day: TodayData = {
      ...nothing,
      decision: { state: 'ready', value: DECISION },
      program: { state: 'ready', value: PROGRAM },
    };
    expect(chips(day, '2026-09-29')).toEqual(['today.chips.why', 'today.chips.swap', 'today.chips.weighIn']);
    const weighed: TodayData = {
      ...day,
      weighIns: {
        state: 'ready',
        value: [{ id: 'w', clientId: 'c', measuredAt: 'x', kg: 80, source: 'MANUAL' }],
      },
    };
    expect(chips(weighed, '2026-09-30')).toEqual(['today.chips.why']);
  });

  test('the coach is never empty: with nothing known there is still a question to start from', () => {
    expect(chips({ ...nothing, weighIns: { state: 'failed', problem: 'NoConnection' } }, '2026-09-29')).toEqual(['today.chips.start']);
  });
});
