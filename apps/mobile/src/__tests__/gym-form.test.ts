/**
 * The gym profile form (K-421, ADR-032): weights typed in the user's unit, kept in kg to the hundredth as the server
 * stores them (ADR-029) — lb plates as lb (45 is 20.41 kg). A list is weights separated by spaces ("2,5" is a decimal
 * where the number pad types a comma). The server checks the limits; the form only catches what is not a weight.
 */
import type { components } from '@/api/schema';
import { buildGym, emptyForm, formOf, parseWeights, rackOf } from '@/train/gymForm';

type Gym = components['schemas']['Gym'];

test('a list of weights: heaviest first, each once, in kg as stored; empty is none; anything else is not a list', () => {
  expect(parseWeights('1.25 20 10  5 2,5 10', 'METRIC')).toEqual([20, 10, 5, 2.5, 1.25]);
  expect(parseWeights('45 25 10 5 2.5', 'IMPERIAL')).toEqual([20.41, 11.34, 4.54, 2.27, 1.13]);
  expect(parseWeights('  ', 'METRIC')).toEqual([]);
  expect(parseWeights('20 ten', 'METRIC')).toBeNull();
  expect(parseWeights('20 0', 'METRIC')).toBeNull();
});

test("a rack from its lightest, heaviest and step, written back as a list in the user's unit", () => {
  expect(rackOf('2', '10', '2')).toBe('2 4 6 8 10');
  expect(rackOf('5', '25', '5')).toBe('5 10 15 20 25');
  expect(rackOf('2', '9', '2.5')).toBe('2 4.5 7');
  // Counted in hundredths: by floats, 1 + 0.1 + 0.1 is 1.2000000000000002, and 1.5 is never reached.
  expect(rackOf('1', '1.5', '0.1')).toBe('1 1.1 1.2 1.3 1.4 1.5');
  expect(rackOf('10', '2', '2')).toBeNull();
  expect(rackOf('2', '10', '0')).toBeNull();
  expect(rackOf('', '10', '2')).toBeNull();
});

test('a stored gym as the form shows it: in its own unit, lb weights on the quarter pound they were entered on', () => {
  const gym: Gym = {
    id: 'g1',
    name: 'Club',
    current: true,
    barKg: 20.41,
    platesKg: [20.41, 1.13],
    dumbbellsKg: [2.27, 4.54],
    stackStepKg: 4.54,
    machines: [{ exerciseId: 'leg_extension', stepKg: 2.27 }],
  };
  expect(formOf(gym, 'METRIC')).toEqual({
    unit: 'IMPERIAL',
    name: 'Club',
    current: true,
    bar: '45',
    plates: '45 2.5',
    dumbbells: '5 10',
    stackStep: '10',
    machines: { leg_extension: '5' },
  });
  expect(formOf({ ...gym, barKg: undefined, stackStepKg: undefined, machines: [] }, 'METRIC')).toMatchObject({
    bar: '',
    stackStep: '',
    machines: {},
  });
});

test('the form as the server takes it: kg, empty fields absent, a machine without a step left out', () => {
  const form = {
    ...emptyForm('METRIC'),
    name: ' Home ',
    bar: '20',
    plates: '20 10 5',
    dumbbells: '',
    stackStep: '',
    machines: { leg_extension: '7.5', cable_row: '' },
  };
  expect(buildGym(form)).toEqual({
    kind: 'ok',
    input: {
      name: 'Home',
      current: false,
      barKg: 20,
      platesKg: [20, 10, 5],
      dumbbellsKg: [],
      machines: [{ exerciseId: 'leg_extension', stepKg: 7.5 }],
    },
  });
});

test('what is not a weight is caught by its field; a gym needs a name', () => {
  expect(buildGym({ ...emptyForm('METRIC'), name: '  ' })).toEqual({ kind: 'problem', field: 'name' });
  expect(buildGym({ ...emptyForm('METRIC'), name: 'Home', bar: 'x' })).toEqual({ kind: 'problem', field: 'bar' });
  expect(buildGym({ ...emptyForm('METRIC'), name: 'Home', plates: '20 x' })).toEqual({ kind: 'problem', field: 'plates' });
  expect(buildGym({ ...emptyForm('METRIC'), name: 'Home', dumbbells: '0' })).toEqual({ kind: 'problem', field: 'dumbbells' });
  expect(buildGym({ ...emptyForm('METRIC'), name: 'Home', stackStep: '-5' })).toEqual({ kind: 'problem', field: 'stackStep' });
  expect(buildGym({ ...emptyForm('METRIC'), name: 'Home', machines: { leg_extension: 'x' } })).toEqual({ kind: 'problem', field: 'machines' });
});

describe('a gym is edited in its own unit: what is on the rack, whatever the user reads loads in', () => {
  const KG_GYM: Gym = {
    id: 'g',
    name: 'Club',
    current: true,
    barKg: 20,
    platesKg: [20, 10, 5, 2.5, 1.25],
    dumbbellsKg: [12, 10],
    stackStepKg: 5,
    machines: [{ exerciseId: 'leg_extension', stepKg: 7.5 }],
  };
  const LB_GYM: Gym = {
    id: 'h',
    name: 'Garage',
    current: false,
    barKg: 20.41,
    platesKg: [20.41, 11.34, 1.13],
    dumbbellsKg: [6.8, 2.27],
    machines: [],
  };
  const DUMBBELLS_IN_LB: Gym = { id: 'd', name: 'Rack', current: false, platesKg: [], dumbbellsKg: [4.54, 2.27], machines: [] };

  test('a kg gym for a lb user is shown in kg', () => {
    expect(formOf(KG_GYM, 'IMPERIAL')).toMatchObject({ unit: 'METRIC', bar: '20', plates: '20 10 5 2.5 1.25' });
    expect(formOf(DUMBBELLS_IN_LB, 'METRIC')).toMatchObject({ unit: 'IMPERIAL', dumbbells: '10 5' });
  });

  test.each([
    ['a kg gym', KG_GYM],
    ['a lb gym', LB_GYM],
    ['a lb rack alone', DUMBBELLS_IN_LB],
  ])('%s saved untouched is the gym it was, for either user', (_name, gym) => {
    const { id: _, ...stored } = gym;
    for (const units of ['METRIC', 'IMPERIAL'] as const) {
      expect(buildGym(formOf(gym, units))).toEqual({ kind: 'ok', input: stored });
    }
  });

  test("a new gym starts in the user's unit", () => {
    expect(emptyForm('IMPERIAL').unit).toBe('IMPERIAL');
  });
});
