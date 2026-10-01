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
  expect(rackOf('10', '2', '2')).toBeNull();
  expect(rackOf('2', '10', '0')).toBeNull();
  expect(rackOf('', '10', '2')).toBeNull();
});

test('a stored gym as the form shows it: lb weights on the quarter pound they were entered on', () => {
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
  expect(formOf(gym, 'IMPERIAL')).toEqual({
    name: 'Club',
    current: true,
    bar: '45',
    plates: '45 2.5',
    dumbbells: '5 10',
    stackStep: '10',
    machines: { leg_extension: '5' },
  });
  expect(formOf({ ...gym, barKg: undefined, stackStepKg: undefined, machines: [] }, 'IMPERIAL')).toMatchObject({
    bar: '',
    stackStep: '',
    machines: {},
  });
});

test('the form as the server takes it: kg, empty fields absent, a machine without a step left out', () => {
  const form = {
    ...emptyForm(),
    name: ' Home ',
    bar: '20',
    plates: '20 10 5',
    dumbbells: '',
    stackStep: '',
    machines: { leg_extension: '7.5', cable_row: '' },
  };
  expect(buildGym(form, 'METRIC')).toEqual({
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
  expect(buildGym({ ...emptyForm(), name: '  ' }, 'METRIC')).toEqual({ kind: 'problem', field: 'name' });
  expect(buildGym({ ...emptyForm(), name: 'Home', bar: 'x' }, 'METRIC')).toEqual({ kind: 'problem', field: 'bar' });
  expect(buildGym({ ...emptyForm(), name: 'Home', plates: '20 x' }, 'METRIC')).toEqual({ kind: 'problem', field: 'plates' });
  expect(buildGym({ ...emptyForm(), name: 'Home', dumbbells: '0' }, 'METRIC')).toEqual({ kind: 'problem', field: 'dumbbells' });
  expect(buildGym({ ...emptyForm(), name: 'Home', stackStep: '-5' }, 'METRIC')).toEqual({ kind: 'problem', field: 'stackStep' });
  expect(buildGym({ ...emptyForm(), name: 'Home', machines: { leg_extension: 'x' } }, 'METRIC')).toEqual({ kind: 'problem', field: 'machines' });
});
