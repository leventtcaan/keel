/**
 * This week (K-969, ADR-077 #1): which face the screen shows, read from what the server said. The week is the server's
 * (Consistency.weekOf, the program's week by date, FirstWeeks.week); the phone only lays the days of that week out and
 * counts the days to a date the server gave (ADR-077 Ek 2). Nothing here decides.
 */
import type { components } from '@/api/schema';
import type { Loaded, TodayData } from '@/today/today';
import { addDays, daysBetween, heroOf, loadWeekLogs, loggedDays, stripDays, trainedDays, weekdayOf, weekHead, weekMonday } from '@/today/week';

type Schemas = components['schemas'];

const ready = <T>(value: T): Loaded<T> => ({ state: 'ready', value });
const none = { state: 'none' } as const;
const consent = { state: 'consent' } as const;

const CONSISTENCY: Schemas['Consistency'] = {
  weekOf: '2026-12-21',
  training: { planned: 3, done: 2 },
  protein: { planned: 4, done: 3 },
  steps: { planned: 5, done: 5 },
  weighIns: { planned: 7, done: 6 },
  planned: 19,
  done: 16,
  percent: 84,
  record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
};
const decision = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-21',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [{ rule: 'plateau', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-12-28',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
  changes: [],
  ...extra,
});
const FIRST_WEEKS: Schemas['FirstWeeks'] = { week: 1, risk: [], readsRisk: false, training: true, firstCallOn: '2026-10-19' };
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [],
  week: [
    { programDayId: 'a', date: '2026-12-21', exerciseIds: [] },
    { programDayId: 'b', date: '2026-12-23', exerciseIds: [] },
    { programDayId: 'c', date: '2026-12-25', exerciseIds: [] },
  ],
};
const data = (extra: Partial<TodayData> = {}): TodayData => ({
  consistency: ready(CONSISTENCY),
  decision: ready(decision()),
  program: ready(PROGRAM),
  weighIns: ready([]),
  targets: none,
  budget: none,
  checkIn: none,
  state: none,
  prompts: none,
  firstWeeks: none,
  ...extra,
});

describe('calendar days, read as dates only', () => {
  test('the weekday of a day, whatever the phone’s time zone', () => {
    expect(weekdayOf('2026-12-21')).toBe('MONDAY');
    expect(weekdayOf('2026-12-27')).toBe('SUNDAY');
  });

  test('days on from a day, across a month and a year', () => {
    expect(addDays('2026-12-28', 6)).toBe('2027-01-03');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });

  test('the days between two dates: 0 the same day, negative when past', () => {
    expect(daysBetween('2026-12-25', '2026-12-28')).toBe(3);
    expect(daysBetween('2026-12-28', '2026-12-28')).toBe(0);
    expect(daysBetween('2026-12-29', '2026-12-28')).toBe(-1);
  });
});

describe("the week's Monday is the server's", () => {
  test("the program's week first, the week its sessions are laid out on (Program.weekOf, K-995)", () => {
    expect(weekMonday(ready({ ...CONSISTENCY, weekOf: '2026-12-14' }), ready({ ...PROGRAM, weekOf: '2026-12-21' }), '2026-12-25')).toBe('2026-12-21');
    expect(weekMonday(none, ready({ ...PROGRAM, weekOf: '2026-10-12' }), '2026-10-12')).toBe('2026-10-12');
  });

  test("no program, or one from a server that does not name its week yet: the consistency's week", () => {
    expect(weekMonday(ready(CONSISTENCY), none, '2026-12-25')).toBe('2026-12-21');
    expect(weekMonday(ready(CONSISTENCY), ready(PROGRAM), '2026-12-25')).toBe('2026-12-21');
  });

  test("neither: the week of today on the phone's calendar", () => {
    expect(weekMonday(consent, none, '2026-10-15')).toBe('2026-10-12');
  });
});

describe('the week strip: trained, logged, planned; an empty day is only empty', () => {
  const days = stripDays('2026-12-21', '2026-12-25', PROGRAM.week ?? [], ['2026-12-21', '2026-12-23'], ['2026-12-22', '2026-12-23']);

  test('Monday to Sunday, today marked', () => {
    expect(days.map((d) => d.weekday)).toEqual(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
    expect(days.map((d) => d.date)).toEqual(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27']);
    expect(days.filter((d) => d.today).map((d) => d.weekday)).toEqual(['FRIDAY']);
  });

  test('a session done is trained, not planned; a weigh-in is a log; a session to come is planned', () => {
    expect(days[0]).toMatchObject({ trained: true, planned: false, logged: false });
    expect(days[1]).toMatchObject({ trained: false, planned: false, logged: true });
    expect(days[2]).toMatchObject({ trained: true, planned: false, logged: true });
    expect(days[4]).toMatchObject({ trained: false, planned: true });
  });

  test('a session of a day gone by, not done, has no ring: it is only empty, never missed (U7)', () => {
    const week: Schemas['WeekSession'][] = [
      { programDayId: 'a', date: '2026-12-21', exerciseIds: [] },
      { programDayId: 'b', date: '2026-12-23', exerciseIds: [] },
      { programDayId: 'c', date: '2026-12-25', exerciseIds: [] },
    ];
    const strip = stripDays('2026-12-21', '2026-12-25', week, ['2026-12-21'], []);
    expect(strip[2]).toMatchObject({ date: '2026-12-23', trained: false, planned: false });
    expect(strip[4]).toMatchObject({ date: '2026-12-25', planned: true });
  });

  test('a day with nothing has no mark at all (no red, no missed)', () => {
    expect(days[3]).toEqual({ weekday: 'THURSDAY', date: '2026-12-24', trained: false, logged: false, planned: false, today: false });
  });

  test("a skipped session is not planned any more; a moved one is planned on its new day (the server's week)", () => {
    const week: Schemas['WeekSession'][] = [
      { programDayId: 'a', date: '2026-12-25', exerciseIds: [], skipped: true },
      { programDayId: 'b', date: '2026-12-26', exerciseIds: [], moved: true },
    ];
    const moved = stripDays('2026-12-21', '2026-12-25', week, [], []);
    expect(moved[4].planned).toBe(false);
    expect(moved[5].planned).toBe(true);
  });
});

describe("the week's head", () => {
  test("the record of weeks on track, as the server counted it, and the first weeks' number", () => {
    expect(weekHead(ready(CONSISTENCY), ready({ ...FIRST_WEEKS, week: 9 }))).toEqual({ week: 9, record: { onTrack: 11, counted: 12 }, countedByWeek: false });
  });

  test('no week over yet (before the first call, or none counted): "Counted by week"', () => {
    expect(weekHead(none, ready(FIRST_WEEKS))).toEqual({ week: 1, record: null, countedByWeek: true });
    const fresh = { ...CONSISTENCY, record: { onTrackWeeks: 0, countedWeeks: 0, currentRun: 0, forgivenWeeks: 0 } };
    expect(weekHead(ready(fresh), ready({ ...FIRST_WEEKS, week: 2 }))).toEqual({ week: 2, record: null, countedByWeek: true });
  });

  test('after the first eight weeks the server names no week: none is made up', () => {
    expect(weekHead(ready(CONSISTENCY), none).week).toBeNull();
  });

  test('without the health data consent: no record and nothing said about it (ADR-072 Ek 1)', () => {
    expect(weekHead(consent, consent)).toEqual({ week: null, record: null, countedByWeek: false });
  });
});

describe('the one hero (ADR-077 #1)', () => {
  test("a week paused: the state's own card, nothing else", () => {
    const paused = data({ state: ready({ kind: 'BUSY', since: '2026-12-22' } as Schemas['DeclaredState']) });
    expect(heroOf(paused)).toEqual({ kind: 'paused' });
  });

  test('a week paused with the check-in open: "Open your call" (it asks whether the state still holds)', () => {
    const paused = data({
      state: ready({ kind: 'BUSY', since: '2026-12-22' } as Schemas['DeclaredState']),
      checkIn: ready({ weekOf: '2026-12-28', questions: [{} as Schemas['Question']], answered: false }),
    });
    expect(heroOf(paused)).toEqual({ kind: 'monday', week: null, questions: 1, weekday: 'MONDAY' });
  });

  test('the check-in open, not answered: "Open your call", with the week and how many questions', () => {
    const checkIn = ready({ weekOf: '2026-12-28', questions: [{} as Schemas['Question']], answered: false });
    expect(heroOf(data({ checkIn, firstWeeks: ready({ ...FIRST_WEEKS, week: 3 }) }))).toEqual({ kind: 'monday', week: 3, questions: 1, weekday: 'MONDAY' });
    expect(heroOf(data({ checkIn }))).toEqual({ kind: 'monday', week: null, questions: 1, weekday: 'MONDAY' });
  });

  test("answered: the week's call", () => {
    const checkIn = ready({ weekOf: '2026-12-28', questions: [], answered: true });
    expect(heroOf(data({ checkIn }))).toEqual({ kind: 'call', decision: decision(), declined: false });
  });

  test('a call declined (last week\'s plan kept): "Not applied"', () => {
    const declined = decision({ application: { state: 'DECLINED' } });
    expect(heroOf(data({ decision: ready(declined) }))).toEqual({ kind: 'call', decision: declined, declined: true });
  });

  test('no call yet: the first week, with the first call day the server named', () => {
    expect(heroOf(data({ decision: none, consistency: none, firstWeeks: ready(FIRST_WEEKS) }))).toEqual({ kind: 'firstWeek', firstCallOn: '2026-10-19' });
    expect(heroOf(data({ decision: none, consistency: none, firstWeeks: none }))).toEqual({ kind: 'firstWeek', firstCallOn: null });
  });

  test('without the health data consent: the weekly calls are off', () => {
    expect(heroOf(data({ decision: consent, consistency: consent, firstWeeks: consent }))).toEqual({ kind: 'callsOff' });
  });

  test('a call that could not be read: no hero (the screen says it failed once)', () => {
    expect(heroOf(data({ decision: { state: 'failed', problem: 'NoConnection' } }))).toEqual({ kind: 'none' });
  });
});

describe("the week's logs, read from the server's week", () => {
  const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
  const refused = (status: number, code: string) => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

  test('the workouts and the weigh-ins from the Monday to today', async () => {
    const GET = jest.fn(async (path: string, _init?: unknown) => (path === '/v1/workouts' ? ok([]) : refused(403, 'CONSENT_REQUIRED')));
    const logs = await loadWeekLogs({ GET } as never, '2026-12-21', '2026-12-25');
    expect(logs).toEqual({ workouts: { state: 'ready', value: [] }, weighIns: { state: 'consent' } });
    expect(GET).toHaveBeenCalledWith('/v1/workouts', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
    expect(GET).toHaveBeenCalledWith('/v1/weigh-ins', { params: { query: { from: '2026-12-21', to: '2026-12-25' } } });
  });

  test("the server's Monday after the phone's today (time zones apart, a new week there): the range never turns over", async () => {
    const GET = jest.fn(async (_path: string, _init?: unknown) => ok([]));
    await loadWeekLogs({ GET } as never, '2026-12-28', '2026-12-27');
    expect(GET).toHaveBeenCalledWith('/v1/workouts', { params: { query: { from: '2026-12-27', to: '2026-12-27' } } });
  });

  test('a day trained is a day a workout was finished; one still open is not', () => {
    const workout = (startedAt: string, endedAt?: string) => ({ id: startedAt, clientId: startedAt, startedAt, ...(endedAt ? { endedAt } : {}), sets: [] });
    const workouts: Loaded<Schemas['Workout'][]> = ready([workout('2026-12-21T12:00:00Z', '2026-12-21T13:00:00Z'), workout('2026-12-23T12:00:00Z')]);
    expect(trainedDays(workouts)).toEqual(['2026-12-21']);
    expect(trainedDays({ state: 'failed', problem: 'NoConnection' })).toEqual([]);
  });

  test('a day logged is a day with a weigh-in', () => {
    const weighIns = ready([{ id: 'w', clientId: 'c', measuredAt: '2026-12-22T12:00:00Z', kg: 80, source: 'MANUAL' }] as Schemas['WeighIn'][]);
    expect(loggedDays(weighIns)).toEqual(['2026-12-22']);
    expect(loggedDays(consent)).toEqual([]);
  });
});
