/**
 * The day's plan in one phrase (K-1217, #725): today's training day is the Train card's (todayCardOf), the calories left the
 * server's budget as the one number the food page shows. A rest day, a program or budget that could not be read, a day past its
 * target: that part is left out, nothing guessed, nothing blamed (U1, U7).
 */
import type { components } from "@/api/schema";
import { planLine, readDayPlan, trainingToday } from "@/today/dayPlan";

type Schemas = components["schemas"];
type Answer = {
  data?: unknown;
  error?: { code: string; message: string };
  response: { status: number };
};

const NOW = new Date(2026, 8, 29, 13, 0);
const DAY: Schemas["ProgramDay"] = {
  id: "a",
  nameKey: "programDays.full_body_a.name",
  weekday: "TUESDAY",
  exercises: [],
};
const PROGRAM = (week: Schemas["Program"]["week"]): Schemas["Program"] => ({
  id: "p",
  source: "GENERATED",
  days: [DAY],
  today: "2026-09-29",
  weekOf: "2026-09-28",
  week,
});
const TODAYS: Schemas["WeekSession"] = {
  programDayId: "a",
  date: "2026-09-29",
  exerciseIds: [],
};
const BUDGET = (low: number, high: number): Schemas["DayBudget"] => ({
  day: "2026-09-29",
  targetKcal: 2300,
  targetProteinG: 140,
  eaten: { kcal: { low: 1000, high: 1200 }, proteinG: { low: 60, high: 80 }, carbsG: { low: 100, high: 120 }, fatG: { low: 30, high: 40 } },
  left: { kcal: { low, high }, proteinG: { low: 60, high: 80 } },
});

const api = (answers: Record<string, Answer | "offline">) =>
  ({
    GET: jest.fn(async (path: string) => {
      const answer = answers[path] ?? { response: { status: 404 } };
      if (answer === "offline") throw new TypeError("Network request failed");
      return answer as never;
    }),
  }) as never;
const ok = (data: unknown): Answer => ({ data, response: { status: 200 } });

describe("today's training day", () => {
  test("a session today: its program day", async () => {
    const day = await trainingToday(
      { api: api({ "/v1/program": ok(PROGRAM([TODAYS])) }) },
      NOW,
    );
    expect(day?.id).toBe("a");
  });

  test("a rest day, a skipped session, a session moved off today: none", async () => {
    const rest = await trainingToday(
      {
        api: api({
          "/v1/program": ok(PROGRAM([{ ...TODAYS, date: "2026-09-30" }])),
        }),
      },
      NOW,
    );
    expect(rest).toBeNull();
    const skipped = await trainingToday(
      {
        api: api({
          "/v1/program": ok(PROGRAM([{ ...TODAYS, skipped: true }])),
        }),
      },
      NOW,
    );
    expect(skipped).toBeNull();
  });

  test("a week off: none", async () => {
    const off = await trainingToday(
      {
        api: api({
          "/v1/program": ok({ ...PROGRAM([TODAYS]), restUntil: "2026-10-04" }),
        }),
      },
      NOW,
    );
    expect(off).toBeNull();
  });

  test("the program not read (offline, none yet): none, nothing guessed", async () => {
    expect(
      await trainingToday({ api: api({ "/v1/program": "offline" }) }, NOW),
    ).toBeNull();
    expect(await trainingToday({ api: api({}) }, NOW)).toBeNull();
  });

  test("a workout finished on this phone today is still a training day", async () => {
    const records = async () => [
      {
        seq: 1,
        clientId: "w",
        kind: "workout",
        parentClientId: null,
        body: {
          clientId: "w",
          startedAt: new Date(2026, 8, 29, 9, 0).toISOString(),
          programDayId: "a",
        },
        state: "SYNCED",
        serverId: "s",
        serverBody: null,
        errorCode: null,
      },
      {
        seq: 2,
        clientId: "f",
        kind: "finish",
        parentClientId: "w",
        body: { endedAt: new Date(2026, 8, 29, 10, 0).toISOString() },
        state: "SYNCED",
        serverId: null,
        serverBody: null,
        errorCode: null,
      },
    ];
    const day = await trainingToday(
      {
        api: api({ "/v1/program": ok(PROGRAM([TODAYS])) }),
        workoutRecords: records as never,
      },
      NOW,
    );
    expect(day?.id).toBe("a");
  });

  test("a store of workouts that cannot be read never keeps the answer from showing", async () => {
    const day = await trainingToday(
      {
        api: api({ "/v1/program": ok(PROGRAM([TODAYS])) }),
        workoutRecords: async () => Promise.reject(new Error("x")),
      },
      NOW,
    );
    expect(day?.id).toBe("a");
  });
});

describe("the day in one phrase", () => {
  test('a training day with food left: "Today: Full body A · 1,136 kcal left", the middle of the server range', async () => {
    const plan = await readDayPlan(
      {
        api: api({
          "/v1/program": ok(PROGRAM([TODAYS])),
          "/v1/days/{day}/budget": ok(BUDGET(1100, 1172)),
        }),
      },
      NOW,
    );
    expect(plan).toEqual({ training: "Full body A", kcalLeft: 1136 });
    expect(planLine(plan)).toBe("Today: Full body A · 1,136 kcal left");
  });

  test("a rest day: only the food", async () => {
    const plan = await readDayPlan(
      {
        api: api({
          "/v1/program": ok(PROGRAM([])),
          "/v1/days/{day}/budget": ok(BUDGET(1100, 1172)),
        }),
      },
      NOW,
    );
    expect(planLine(plan)).toBe("Today: 1,136 kcal left");
  });

  test("past the target or across zero: no calories said (no blame, no make-up, U7), the training day stays", async () => {
    const over = await readDayPlan(
      {
        api: api({
          "/v1/program": ok(PROGRAM([TODAYS])),
          "/v1/days/{day}/budget": ok(BUDGET(-300, -200)),
        }),
      },
      NOW,
    );
    expect(planLine(over)).toBe("Today: Full body A");
    const around = await readDayPlan(
      {
        api: api({
          "/v1/program": ok(PROGRAM([TODAYS])),
          "/v1/days/{day}/budget": ok(BUDGET(-50, 40)),
        }),
      },
      NOW,
    );
    expect(planLine(around)).toBe("Today: Full body A");
  });

  test("nothing could be read: no phrase at all", async () => {
    const plan = await readDayPlan(
      {
        api: api({
          "/v1/program": "offline",
          "/v1/days/{day}/budget": "offline",
        }),
      },
      NOW,
    );
    expect(plan).toEqual({ training: null, kcalLeft: null });
    expect(planLine(plan)).toBeNull();
  });
});
