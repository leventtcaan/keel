/**
 * The gym profile (K-421, ADR-032): from Settings, the user's gyms — the one in use marked — and a gym's equipment, typed
 * in the user's unit (lb plates as lb), stored in kg; added, changed, made the one in use, deleted. Writing needs the
 * server; the one in use is kept on the phone by the training read (K-417), so warm-ups and plates work offline.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import GymScreen from '@/app/gym';
import GymsScreen from '@/app/gyms';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => mockBack() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-gym-id' }));

const GYMS: Schemas['Gym'][] = [
  { id: 'g1', name: 'Home', current: false, platesKg: [10, 5], dumbbellsKg: [], machines: [] },
  { id: 'g2', name: 'Club', current: true, barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [10, 12], stackStepKg: 5, machines: [] },
];
const EXERCISES = [
  { id: 'leg_extension', equipment: 'MACHINE', load: 'EXTERNAL', kind: 'ISOLATION', unilateral: false },
  { id: 'bench_press', equipment: 'BARBELL', load: 'EXTERNAL', kind: 'COMPOUND', unilateral: false },
] as Schemas['Exercise'][];

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];
let answer: (call: Call) => Response | 'offline';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const api = createApiClient({
  baseUrl: 'https://api.example.test',
  accessToken: async () => 'tok',
  fetch: async (request: Request) => {
    const text = await request.text();
    const call = { method: request.method, path: new URL(request.url).pathname, body: text === '' ? null : JSON.parse(text) };
    calls.push(call);
    const found = answer(call);
    if (found === 'offline') throw new TypeError('Network request failed');
    return found;
  },
});
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockExercises: { state: 'ready'; value: Schemas['Exercise'][] } | { state: 'failed'; problem: 'NoConnection' };
const mockServices = {
  api,
  training: { read: async () => ({ program: { state: 'none' }, exercises: mockExercises, kept: false }) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  calls = [];
  mockUnits = 'METRIC';
  mockExercises = { state: 'ready', value: EXERCISES };
  mockParams = {};
  answer = (call) =>
    call.method === 'GET'
      ? json(GYMS)
      : call.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : json({ ...GYMS[0], ...(call.body as object) });
});

const show = (screenToShow: 'list' | 'gym') => render(<ThemeProvider>{screenToShow === 'list' ? <GymsScreen /> : <GymScreen />}</ThemeProvider>);
const puts = () => calls.filter((c) => c.method === 'PUT');

describe('the list', () => {
  test('each gym, the one in use marked; a gym opens; a new one opens empty under a new id', async () => {
    await show('list');
    expect(await screen.findByText('Club')).toBeTruthy();
    expect(screen.getByText('In use')).toBeTruthy();
    await fireEvent.press(screen.getByText('Home'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/gym', params: { id: 'g1' } });
    await fireEvent.press(screen.getByText('Add a gym'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/gym', params: { id: 'new-gym-id' } });
  });

  test("offline: says the gyms couldn't load, and trying again reads again", async () => {
    answer = () => 'offline';
    await show('list');
    expect(await screen.findByText("Your gyms couldn't load. Try again when you're online.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2);
  });
});

describe('a gym', () => {
  test('its equipment is shown as stored, and a change is saved whole under its id, in kg', async () => {
    mockParams = { id: 'g2' };
    await show('gym');
    expect(await screen.findByDisplayValue('20 10 5 2.5 1.25')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Plates (kg), separated by spaces'), '25 20 10 5 2.5 1.25');
    await fireEvent.press(screen.getByText('Save'));
    expect(puts()).toEqual([
      {
        method: 'PUT',
        path: '/v1/gyms/g2',
        body: { name: 'Club', current: true, barKg: 20, platesKg: [25, 20, 10, 5, 2.5, 1.25], dumbbellsKg: [12, 10], stackStepKg: 5, machines: [] }, // lists heaviest first
      },
    ]);
    expect(mockBack).toHaveBeenCalled();
  });

  test('a new gym in lb: lb plates as lb, a rack filled from its lightest, heaviest and step, a machine with its own step', async () => {
    mockUnits = 'IMPERIAL';
    mockParams = { id: 'new-gym-id' };
    await show('gym');
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Garage');
    await fireEvent.changeText(screen.getByLabelText('Bar (lb)'), '45');
    await fireEvent.changeText(screen.getByLabelText('Plates (lb), separated by spaces'), '45 25 10 5 2.5');
    await fireEvent.changeText(screen.getByLabelText('Lightest'), '5');
    await fireEvent.changeText(screen.getByLabelText('Heaviest'), '15');
    await fireEvent.changeText(screen.getByLabelText('Step'), '5');
    await fireEvent.press(screen.getByText('Fill the rack'));
    expect(screen.getByDisplayValue('5 10 15')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Leg extension: its own step (lb)'), '10');
    await fireEvent.press(screen.getByText('Use this gym'));
    await fireEvent.press(screen.getByText('Save'));
    expect(puts()[0]).toEqual({
      method: 'PUT',
      path: '/v1/gyms/new-gym-id',
      body: {
        name: 'Garage',
        current: true,
        barKg: 20.41,
        platesKg: [20.41, 11.34, 4.54, 2.27, 1.13],
        dumbbellsKg: [6.8, 4.54, 2.27],
        machines: [{ exerciseId: 'leg_extension', stepKg: 4.54 }],
      },
    });
  });

  test('what is not a weight is said on its field and nothing is sent', async () => {
    mockParams = { id: 'g2' };
    await show('gym');
    await fireEvent.changeText(await screen.findByLabelText('Plates (kg), separated by spaces'), '20 ten');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Write each plate as a number, with spaces between.')).toBeTruthy();
    expect(puts()).toEqual([]);
  });

  test("a gym the server refuses (past its limits) says so; offline, that it couldn't be saved; the screen stays", async () => {
    mockParams = { id: 'g2' };
    answer = (call) => (call.method === 'GET' ? json(GYMS) : json({ code: 'VALIDATION_FAILED' }, 400));
    await show('gym');
    await fireEvent.press(await screen.findByText('Save'));
    expect(await screen.findByText("This gym wasn't saved: something in it is past what the app takes. Check the name and the lists.")).toBeTruthy();
    answer = (call) => (call.method === 'GET' ? json(GYMS) : 'offline');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText("This gym couldn't be saved. Try again when you're online.")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('a gym is deleted', async () => {
    mockParams = { id: 'g1' };
    await show('gym');
    await fireEvent.press(await screen.findByText('Delete this gym'));
    expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({ path: '/v1/gyms/g1' });
    expect(mockBack).toHaveBeenCalled();
  });

  test('a new gym has nothing to delete; the first gym is the one in use', async () => {
    answer = (call) => (call.method === 'GET' ? json([]) : json({}));
    mockParams = { id: 'new-gym-id' };
    await show('gym');
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Home');
    expect(screen.queryByText('Delete this gym')).toBeNull();
    await act(async () => fireEvent.press(screen.getByText('Save')));
    expect(puts()[0].body).toMatchObject({ current: true });
  });
});

test('a lb user opens a kg gym: it reads in kg, as its plates are marked, and saved untouched it stays the same gym', async () => {
  mockUnits = 'IMPERIAL';
  mockParams = { id: 'g2' };
  await show('gym');
  expect(await screen.findByDisplayValue('20 10 5 2.5 1.25')).toBeTruthy();
  expect(screen.getByLabelText('Plates (kg), separated by spaces')).toBeTruthy();
  await fireEvent.press(screen.getByText('Save'));
  const { id: _, ...stored } = GYMS[1];
  expect(puts()[0].body).toEqual({ ...stored, dumbbellsKg: [12, 10] });
});

test('the gyms unread: no form to save over a gym it does not know (an empty one would replace it)', async () => {
  mockParams = { id: 'g2' };
  answer = () => 'offline';
  await show('gym');
  expect(await screen.findByText("Your gyms couldn't load. Try again when you're online.")).toBeTruthy();
  expect(screen.queryByText('Save')).toBeNull();
  expect(puts()).toEqual([]);
});

test('a delete the server does not take, or offline: said, and the screen stays', async () => {
  mockParams = { id: 'g1' };
  answer = (call) => (call.method === 'GET' ? json(GYMS) : json({ code: 'X' }, 500));
  await show('gym');
  await fireEvent.press(await screen.findByText('Delete this gym'));
  expect(await screen.findByText("This gym couldn't be deleted. Try again when you're online.")).toBeTruthy();
  answer = (call) => (call.method === 'GET' ? json(GYMS) : 'offline');
  await fireEvent.press(screen.getByText('Delete this gym'));
  expect(mockBack).not.toHaveBeenCalled();
});

test("a kg user's new gym switched to lb: 45 is a 45 lb bar", async () => {
  mockParams = { id: 'new-gym-id' };
  await show('gym');
  await fireEvent.changeText(await screen.findByLabelText('Name'), 'Garage');
  await fireEvent.press(screen.getByText('lb'));
  await fireEvent.changeText(screen.getByLabelText('Bar (lb)'), '45');
  await fireEvent.press(screen.getByText('Save'));
  expect(puts()[0].body).toMatchObject({ barKg: 20.41 });
});

test('a gym holding a machine the catalog no longer has as one saves without it, untouched', async () => {
  const withRetired = [{ ...GYMS[1], machines: [{ exerciseId: 'leg_extension', stepKg: 5 }, { exerciseId: 'retired_move', stepKg: 7.5 }] }];
  answer = (call) => (call.method === 'GET' ? json(withRetired) : json({}));
  mockParams = { id: 'g2' };
  await show('gym');
  await fireEvent.press(await screen.findByText('Save'));
  expect(puts()[0].body).toMatchObject({ machines: [{ exerciseId: 'leg_extension', stepKg: 5 }] });
});

test('the catalog unread: nothing is known to be gone, every stored machine step is kept', async () => {
  const withRetired = [{ ...GYMS[1], machines: [{ exerciseId: 'leg_extension', stepKg: 5 }, { exerciseId: 'retired_move', stepKg: 7.5 }] }];
  answer = (call) => (call.method === 'GET' ? json(withRetired) : json({}));
  mockExercises = { state: 'failed', problem: 'NoConnection' };
  mockParams = { id: 'g2' };
  await show('gym');
  await fireEvent.press(await screen.findByText('Save'));
  expect((puts()[0].body as { machines: unknown[] }).machines).toHaveLength(2);
});
