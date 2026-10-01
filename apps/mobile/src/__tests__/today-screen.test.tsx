/**
 * The Today screen (K-401, prototype 2.1): the consistency number and its four parts (K-420), this week's call from its
 * copy key with "Why this call" (reasons, their kind of source, the next review), today's list, and the coach's chips
 * from the day's data. A safety call shows as its general change (ADR-028 #24): no word of a hard stop or a cycle on
 * the screen.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import TodayScreen from "@/app/(tabs)/index";
import type { components } from "@/api/schema";
import { t } from "@/copy";
import { ThemeProvider } from "@/theme/theme";
import { formatWeight } from "@/units/units";

type Schemas = components["schemas"];
type Answer = {
  data?: unknown;
  error?: { code: string; message: string };
  response: Response;
};
const ok = (data: unknown): Answer => ({
  data,
  response: new Response(null, { status: 200 }),
});
const refused = (status: number, code: string): Answer => ({
  error: { code, message: "x" },
  response: new Response(null, { status }),
});

const CONSISTENCY: Schemas["Consistency"] = {
  weekOf: "2026-09-28",
  training: { planned: 3, done: 2 },
  protein: { planned: 4, done: 3 },
  steps: { planned: 5, done: 5 },
  weighIns: { planned: 7, done: 6 },
  planned: 19,
  done: 16,
  percent: 84,
  record: { onTrackWeeks: 2, countedWeeks: 3, currentRun: 2 },
};
const decision = (
  copyKey: string,
  extra: Partial<Schemas["Decision"]> = {},
): Schemas["Decision"] => ({
  id: "d1",
  madeOn: "2026-09-28",
  action: { type: "CONTINUE" } as Schemas["Decision"]["action"],
  reasons: [
    {
      rule: copyKey.split(".")[2],
      source: { reference: "arastirma/ham/guray/G2.md#K-1", tag: "EXPERIENCE" },
    },
  ],
  confidence: "HIGH",
  nextReview: "2026-10-05",
  copyKey,
  application: { state: "NOT_NEEDED" },
  ...extra,
});
const PROGRAM: Schemas["Program"] = {
  id: "p1",
  source: "GENERATED",
  days: [{ id: "a", nameKey: "upper_a", weekday: "TUESDAY", exercises: [] }],
};

let mockAnswers: Record<string, Answer | "offline"> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, "NOT_FOUND");
  if (answer === "offline") throw new TypeError("Network request failed");
  return answer;
});
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush }),
}));
// One object for the life of the test, as the real services are built once per process: the screen depends on it.
const mockServices = { api: { GET: mockGET }, report: () => {} };
jest.mock("@/services/ServicesProvider", () => ({
  useAppServices: () => mockServices,
  useUnits: () => "METRIC",
}));

beforeAll(() => {
  // Tuesday 29 Sep 2026, morning, on the phone's calendar; only the date is fake, timers are real.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers = {
    "/v1/consistency": ok(CONSISTENCY),
    "/v1/decisions/current": ok(decision("decision.continue.toward_goal")),
    "/v1/program": ok(PROGRAM),
    "/v1/weigh-ins": ok([
      {
        id: "w",
        clientId: "c",
        measuredAt: "2026-09-29T05:12:00Z",
        kg: 81.4,
        source: "MANUAL",
      },
    ]),
    "/v1/targets": ok({
      stepsPerDay: 8000,
      trainingSessionsPerWeek: 3,
      targetKcal: 2300,
      proteinG: 160,
    }),
  };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <TodayScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole("button", { name }));
  await act(async () => {});
};
/** Everything the screen renders, words and labels, for what must never be there. */
const allText = () => JSON.stringify(screen.toJSON());

test("the number and its four parts, as the server counted them", async () => {
  await show();
  expect(
    screen.getByText(t("today.consistency.percent", { percent: 84 })),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(t("today.consistency.of", { done: 16, planned: 19 })),
  ).toBeOnTheScreen();
  for (const [part, count] of [
    ["training", "2/3"],
    ["protein", "3/4"],
    ["steps", "5/5"],
    ["weighIns", "6/7"],
  ]) {
    expect(
      screen.getByLabelText(
        t("today.consistency.partSpoken", {
          part: t(`today.consistency.${part}`),
          done: count.split("/")[0],
          planned: count.split("/")[1],
        }),
      ),
    ).toBeOnTheScreen();
  }
  expect(
    screen.getByText(t("today.consistency.record", { onTrack: 2, counted: 3 })),
  ).toBeOnTheScreen();
});

test("this week's call: its label, its words from the copy key, its confidence; 'Why this call' opens the reasons", async () => {
  await show();
  expect(screen.getByText(t("decision.continue.label"))).toBeOnTheScreen();
  expect(
    screen.getByText(t("decision.continue.toward_goal.title")),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(t("decision.continue.toward_goal.body")),
  ).toBeOnTheScreen();
  expect(screen.getByText(t("today.call.confidence.HIGH"))).toBeOnTheScreen();
  expect(screen.queryByText(t("today.call.source.EXPERIENCE"))).toBeNull();

  await press(t("today.call.why"));

  expect(screen.getByText(t("today.call.source.EXPERIENCE"))).toBeOnTheScreen();
  expect(
    screen.getByText(t("today.call.nextReview", { date: "Mon, Oct 5" })),
  ).toBeOnTheScreen();
  expect(
    screen.getAllByText(t("decision.continue.toward_goal.title")),
  ).toHaveLength(1); // the leading reason is the title
  await press(t("today.call.hide"));
  expect(screen.queryByText(t("today.call.source.EXPERIENCE"))).toBeNull();
});

test("no call yet this week: the engine's 'not yet', the cycle check's variant included, from its copy key (U3)", async () => {
  mockAnswers["/v1/decisions/current"] = ok(
    decision("decision.no_decision_yet.cycle_check_needed", {
      action: { type: "NO_DECISION_YET" } as Schemas["Decision"]["action"],
    }),
  );
  await show();
  expect(
    screen.getByText(t("decision.no_decision_yet.label")),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(t("decision.no_decision_yet.cycle_check_needed.title")),
  ).toBeOnTheScreen();
});

test('a safety call shows as its general change: no hard stop, no cycle, on the screen or behind "Why this call"', async () => {
  mockAnswers["/v1/decisions/current"] = ok(
    decision("decision.change_phase.low_energy_safety", {
      action: {
        type: "CHANGE_PHASE",
        to: "BULK",
      } as Schemas["Decision"]["action"],
      safety: true,
      reasons: [
        {
          rule: "low_energy_safety",
          source: {
            reference: "arastirma/ham/J1-cinsiyet.md#C6",
            tag: "LITERATURE",
          },
        },
      ],
    }),
  );
  await show();
  await press(t("today.call.why"));
  expect(screen.getByText(t("decision.change_phase.label"))).toBeOnTheScreen();
  expect(allText()).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
  expect(allText()).not.toContain("J1-cinsiyet"); // the reference is the kind of source on the phone, not the file
});

test.each([
  ["decision.mini_cut.appetite_gone", "MINI_CUT"],
  ["decision.continue.mini_cut_running", "CONTINUE"],
  ["decision.change_phase.mini_cut_over", "CHANGE_PHASE"],
])("the short cut speaks with its own words: %s", async (copyKey, type) => {
  mockAnswers["/v1/decisions/current"] = ok(
    decision(copyKey, { action: { type } as Schemas["Decision"]["action"] }),
  );
  await show();
  expect(screen.getByText(t(`${copyKey}.title`))).toBeOnTheScreen();
  expect(screen.getByText(t(`${copyKey}.body`))).toBeOnTheScreen();
});

test("today's list: the weigh-in done, the program's session for today, the step target", async () => {
  await show();
  expect(screen.getByText(t("today.list.weighIn.done"))).toBeOnTheScreen();
  expect(screen.getByText(formatWeight(81.4, "METRIC"))).toBeOnTheScreen();
  expect(screen.getByText(t("programDays.upper_a.name"))).toBeOnTheScreen();
  expect(
    screen.getByText(t("today.list.steps.target", { steps: "8,000" })),
  ).toBeOnTheScreen();
});

test("before anything is there: each part says what comes, and the others still show", async () => {
  mockAnswers = {
    "/v1/weigh-ins": ok([]),
    "/v1/program": ok({ ...PROGRAM, days: [] }),
  };
  await show();
  expect(screen.getByText(t("today.consistency.firstWeek"))).toBeOnTheScreen();
  expect(screen.getByText(t("today.call.none"))).toBeOnTheScreen();
  expect(screen.getByText(t("today.list.weighIn.todo"))).toBeOnTheScreen();
  expect(screen.getByText(t("today.list.training.rest"))).toBeOnTheScreen();
  expect(
    screen.queryByText(t("today.consistency.percent", { percent: 84 })),
  ).toBeNull();
});

test("without the health data consent: no number and no call, a way to Settings instead", async () => {
  for (const path of [
    "/v1/consistency",
    "/v1/decisions/current",
    "/v1/weigh-ins",
    "/v1/targets",
  ]) {
    mockAnswers[path] = refused(403, "CONSENT_REQUIRED");
  }
  await show();
  expect(screen.getByText(t("today.consent.body"))).toBeOnTheScreen();
  expect(
    screen.queryByText(t("today.consistency.percent", { percent: 84 })),
  ).toBeNull();
  await press(t("today.consent.open"));
  expect(mockPush).toHaveBeenCalledWith("/settings");
  expect(screen.getByText(t("programDays.upper_a.name"))).toBeOnTheScreen(); // training is not health data
});

test("offline: it says so, and trying again reads again", async () => {
  for (const path of Object.keys(mockAnswers)) mockAnswers[path] = "offline";
  await show();
  expect(screen.getByText(t("today.failed"))).toBeOnTheScreen();
  const calls = mockGET.mock.calls.length;
  mockAnswers["/v1/consistency"] = ok(CONSISTENCY);
  await press(t("today.retry"));
  expect(mockGET.mock.calls.length).toBeGreaterThan(calls);
  expect(
    screen.getByText(t("today.consistency.percent", { percent: 84 })),
  ).toBeOnTheScreen();
});

test("the coach's chips come from the day; one opens the coach", async () => {
  await show();
  expect(
    screen.getByRole("button", { name: t("today.chips.why") }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: t("today.chips.swap") }),
  ).toBeOnTheScreen();
  await press(t("today.chips.why"));
  expect(mockPush).toHaveBeenCalledWith("/coach");
});

test("Settings is still one tap from Today", async () => {
  await show();
  await press(t("settings.entry"));
  expect(mockPush).toHaveBeenCalledWith("/settings");
});
