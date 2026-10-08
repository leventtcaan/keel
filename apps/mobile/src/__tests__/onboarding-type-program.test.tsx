/**
 * "Type it in" (K-968, ADR-073 #1b): #ob-own's other way in. The program editor (train/ProgramEditor, K-970 reuses it):
 * days with a name and, if the user wants, a weekday; moves from the catalog by search or the user's own (OwnMoveForm);
 * sets and a rep range each, within the contract's OwnProgram. "Use this program" sends it (PUT /v1/program) and the walk
 * goes on as from the import. Routes are rendered from the real src/app folder; the services are faked.
 */
import * as path from 'node:path';

import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const move = (id: string, kind: Schemas['Exercise']['kind']): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind,
  muscles: [],
  alternatives: [],
  load: 'EXTERNAL',
  equipment: 'BARBELL',
  unilateral: false,
  setupFields: [],
});
const mockCatalog = [move('squat', 'COMPOUND'), move('bench_press', 'COMPOUND'), move('barbell_curl', 'ISOLATION')];

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
/** The server keeps the program it is sent, each day with an id (PUT /v1/program). */
const kept = (body: Schemas['OwnProgram']): Schemas['Program'] => ({
  id: 'p1',
  source: 'OWN',
  days: body.days.map((day, i) => ({
    id: `d${i}`,
    name: day.name,
    ...(day.weekday === undefined ? {} : { weekday: day.weekday }),
    exercises: day.exercises.map((e) => ({ exerciseId: e.exerciseId, baseSets: e.sets, sets: e.sets, reps: e.reps, targetRir: 1 })),
  })),
});
const mockAnswer = async (route: string, init: { body?: unknown }): Promise<unknown> => {
  if (route === '/v1/program') return ok(kept(init.body as Schemas['OwnProgram']));
  if (route === '/v1/custom-exercises') return ok({ ...(init.body as object), id: 'custom:8a1d' });
  return ok({ status: 'GRANTED' });
};
const mockApi = { PUT: jest.fn(mockAnswer), POST: jest.fn(mockAnswer), DELETE: jest.fn(mockAnswer) };
const mockProfile = { save: jest.fn(async (_profile: unknown) => {}), refresh: jest.fn(async () => {}) };
const mockSaved = jest.fn(async (_move: unknown) => {});
// One object, as the real provider gives: a screen that reads on its services' change reads once.
const mockServices = {
  profile: mockProfile,
  signOut: jest.fn(),
  api: mockApi,
  queue: { record: jest.fn(async () => true), drain: jest.fn(async () => {}) },
  report: jest.fn(),
  withdrawHealthData: jest.fn(async () => {}),
  consents: { remember: jest.fn(async () => {}) },
  units: { current: () => 'METRIC', keepOnPhone: jest.fn(async () => {}) },
  importFile: { pick: jest.fn(async () => null) },
  training: {
    read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: mockCatalog }, kept: false }),
    own: async () => [] as Move[],
    saved: mockSaved,
  },
};
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => true,
  useSubscriptionGate: () => 'open',
  useAppearance: () => 'light',
  useOnboarding: () => 'needed',
  useUnits: () => 'METRIC',
  useAppServices: () => mockServices,
}));

const APP = path.resolve(__dirname, '../app');
const { programNewMoveSets: SETS, programNewMoveReps: REPS } = workoutParams;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.PUT.mockImplementation(mockAnswer);
  mockApi.POST.mockImplementation(mockAnswer);
});

async function settle() {
  await act(async () => {
    jest.runAllTimers();
  });
}
async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
  await settle();
}
async function choose(name: string) {
  const start = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${start}`) }));
  await settle();
}
const name = (id: string) => t(`exercises.${id}.name`);
const day = (number: number) => t('programEditor.defaultName', { number });

/** Signed in without a profile: goal, experience, "I have my own", "Type it in". */
async function toEditor() {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  await settle();
  await choose(t('onboarding.goal.lose_fat.title'));
  await choose(t('onboarding.experience.Y3_PLUS'));
  await choose(t('onboarding.program.bring_my_own.title'));
  await choose(t('onboarding.own.type.title'));
  return { getPathname: () => router.getPathname() };
}

/** A move added to a day (the n-th "Add a move"), found by what was typed. */
async function addMove(typed: string, id: string, at = 0) {
  await fireEvent.press(screen.getAllByRole('button', { name: t('workout.add.open') })[at]);
  await settle();
  await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), typed);
  await press(t('workout.add.pick', { name: name(id) }));
}
async function step(label: string, actionName: 'increment' | 'decrement', times = 1) {
  for (let i = 0; i < times; i++) await fireEvent(screen.getByRole('adjustable', { name: label }), 'accessibilityAction', { nativeEvent: { actionName } });
  await settle();
}
const puts = () => mockApi.PUT.mock.calls.filter(([route]) => route === '/v1/program');
const confirm = () => screen.getByRole('button', { name: t('onboarding.typeProgram.confirm') });

test('#ob-own offers typing it in beside the import; it opens the editor with one empty day', async () => {
  const router = await toEditor();
  expect(router.getPathname()).toBe('/onboarding/program-type');
  expect(screen.getByRole('header', { name: t('onboarding.typeProgram.title') })).toBeOnTheScreen();
  expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', day(1));
  expect(confirm()).toBeDisabled(); // a day needs a move
});

test('a move found by name comes in with its starting sets and range; the program sent is what is on the screen', async () => {
  const router = await toEditor();
  await addMove('squ', 'squat');
  expect(screen.getByText(name('squat'))).toBeOnTheScreen();
  await step(t('programEditor.setsLabel', { move: name('squat') }), 'increment');
  await step(t('programEditor.maxLabel', { move: name('squat') }), 'increment', 2);
  await fireEvent.changeText(screen.getByLabelText(t('programEditor.dayName')), 'Legs');
  await fireEvent.press(screen.getByRole('button', { name: t('onboarding.schedule.dayName.WEDNESDAY') }));
  await press(t('onboarding.typeProgram.confirm'));
  expect(puts()).toEqual([
    [
      '/v1/program',
      {
        body: {
          days: [
            { name: 'Legs', weekday: 'WEDNESDAY', exercises: [{ exerciseId: 'squat', sets: SETS + 1, reps: { min: REPS.COMPOUND.min, max: REPS.COMPOUND.max + 2 } }] },
          ],
        },
      },
    ],
  ]);
  expect(router.getPathname()).toBe('/onboarding/health-data');
});

test('days added and removed; a weekday one day has is not offered to another', async () => {
  await toEditor();
  await addMove('squ', 'squat');
  await fireEvent.press(screen.getByRole('button', { name: t('onboarding.schedule.dayName.MONDAY') }));
  await press(t('programEditor.addDay'));
  expect(screen.getAllByLabelText(t('programEditor.dayName'))[1]).toHaveProp('value', day(2));
  expect(screen.getAllByRole('button', { name: t('onboarding.schedule.dayName.MONDAY') })[1]).toBeDisabled();
  expect(confirm()).toBeDisabled(); // the new day has no move yet
  await addMove('curl', 'barbell_curl', 1);
  expect(confirm()).toBeEnabled();
  await press(t('programEditor.removeDayLabel', { day: day(1) }));
  await press(t('onboarding.typeProgram.confirm'));
  expect(puts()[0][1]).toEqual({ body: { days: [{ name: day(2), exercises: [{ exerciseId: 'barbell_curl', sets: SETS, reps: REPS.ISOLATION }] }] } });
});

test('a move removed is gone from the day', async () => {
  await toEditor();
  await addMove('squ', 'squat');
  await addMove('bench', 'bench_press');
  await press(t('programEditor.removeMoveLabel', { move: name('squat') }));
  expect(screen.queryByText(name('squat'))).toBeNull();
  await press(t('onboarding.typeProgram.confirm'));
  expect((puts()[0][1].body as Schemas['OwnProgram']).days[0].exercises.map((e) => e.exerciseId)).toEqual(['bench_press']);
});

test("no more days than a program has: Add a day is off at the contract's most", async () => {
  await toEditor();
  for (let i = 1; i < workoutParams.programDaysMax; i++) await press(t('programEditor.addDay'));
  expect(screen.getAllByLabelText(t('programEditor.dayName'))).toHaveLength(workoutParams.programDaysMax);
  expect(screen.getByRole('button', { name: t('programEditor.addDay') })).toBeDisabled();
});

test('sets never under one: the stepper stops there', async () => {
  await toEditor();
  await addMove('squ', 'squat');
  await step(t('programEditor.setsLabel', { move: name('squat') }), 'decrement', SETS + 3);
  expect(screen.getByRole('adjustable', { name: t('programEditor.setsLabel', { move: name('squat') }) })).toHaveAccessibilityValue({ now: 1 });
});

test("the user's own move: made with the engine's questions (OwnMoveForm), then in the day by its id", async () => {
  await toEditor();
  await fireEvent.press(screen.getByRole('button', { name: t('workout.add.open') }));
  await settle();
  await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'Landmine press');
  await press(t('workout.add.create', { name: 'Landmine press' }));
  await press(`${t('ownMove.kind')} ${t('ownMove.kinds.COMPOUND')}`);
  await press(`${t('ownMove.equipment')} ${t('ownMove.equipments.BARBELL')}`);
  await press(`${t('ownMove.unilateral')} ${t('ownMove.no')}`);
  await press(t('ownMove.save'));
  expect(mockApi.POST).toHaveBeenCalledWith('/v1/custom-exercises', { body: expect.objectContaining({ name: 'Landmine press', kind: 'COMPOUND' }) });
  expect(mockSaved).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Landmine press')).toBeOnTheScreen();
  await press(t('onboarding.typeProgram.confirm'));
  expect((puts()[0][1].body as Schemas['OwnProgram']).days[0].exercises).toEqual([{ exerciseId: 'custom:8a1d', sets: SETS, reps: REPS.COMPOUND }]);
});

test('a save that fails is said, the walk waits, and the same program goes again', async () => {
  mockApi.PUT.mockImplementationOnce(async () => {
    throw new TypeError('Network request failed');
  });
  const router = await toEditor();
  await addMove('squ', 'squat');
  await press(t('onboarding.typeProgram.confirm'));
  expect(screen.getByText(t('onboarding.programImport.failed.NoConnection'))).toBeOnTheScreen();
  expect(router.getPathname()).toBe('/onboarding/program-type');
  await press(t('onboarding.typeProgram.confirm'));
  expect(puts()).toHaveLength(2);
  expect(puts()[1][1]).toEqual(puts()[0][1]);
  expect(router.getPathname()).toBe('/onboarding/health-data');
});

test("an export with no routine to read offers typing it in instead", async () => {
  mockServices.importFile.pick.mockResolvedValueOnce('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2025-03-15 11:00:00,"Arms",1h,"Bicep Curl (Dumbbell)",1,14,12,0,0,"","",' as never);
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  await settle();
  await choose(t('onboarding.goal.lose_fat.title'));
  await choose(t('onboarding.experience.Y3_PLUS'));
  await choose(t('onboarding.program.bring_my_own.title'));
  await choose(t('onboarding.own.import.title'));
  await press(t('onboarding.programImport.choose'));
  expect(screen.getByText(t('onboarding.programImport.noRoutine'))).toBeOnTheScreen();
  await press(t('onboarding.own.type.title'));
  expect(router.getPathname()).toBe('/onboarding/program-type');
});
