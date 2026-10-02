/**
 * A move's screen (K-418, ADR-017): the setup first — seat, pad, grip, kept on this phone —, then the demo clips (not
 * filmed yet: said so, nothing in their place), Güray's tips for the move, and the muscles it works.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ExerciseScreen from '@/app/exercise';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { workoutParams } from '@/train/params';
import type { Move, TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

let mockParams: { exercise?: string } = {};
// The drawing itself is the library's (SVG); what the screen hands it is what is tested.
const mockBody = jest.fn((_props: { side?: string; data: ReadonlyArray<{ slug?: string }> }) => null);
jest.mock('react-native-body-highlighter', () => ({ __esModule: true, default: (props: { side?: string; data: ReadonlyArray<{ slug?: string }> }) => mockBody(props) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams }));

const move = (id: string, extra: Partial<Schemas['Exercise']>): Schemas['Exercise'] => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind: 'COMPOUND',
  muscles: [],
  alternatives: [],
  load: 'EXTERNAL',
  equipment: 'MACHINE',
  unilateral: false,
  setupFields: [],
  ...extra,
});
const CATALOG = [
  move('leg_press', { muscles: ['quads', 'glutes'], setupFields: ['seat_height', 'foot_position'] }),
  move('lateral_raise', { kind: 'ISOLATION', muscles: ['side_delts'], equipment: 'DUMBBELL' }),
];
let mockSetups: Record<string, Record<string, string>> = {};
let mockOwn: Move[] = [];
const mockSave = jest.fn(async (id: string, values: Record<string, string>) => void (mockSetups[id] = values));
const mockData: TrainData = { program: { state: 'none' }, exercises: { state: 'ready', value: CATALOG }, kept: false };
const mockServices = {
  api: {},
  training: {
    read: async () => mockData,
    own: async () => mockOwn,
    setup: async (id: string) => mockSetups[id] ?? {},
    saveSetup: (id: string, values: Record<string, string>) => mockSave(id, values),
  },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { exercise: 'leg_press' };
  mockSetups = {};
  mockOwn = [];
});

const show = () =>
  render(
    <ThemeProvider>
      <ExerciseScreen />
    </ThemeProvider>,
  );
const seat = () => screen.getByLabelText(t('exerciseSetup.seat_height.label'));

test("the setup first, saved on the phone and there when the move is opened again", async () => {
  await show();
  expect(await screen.findByText(t('demo.setup'))).toBeOnTheScreen();
  await fireEvent.changeText(seat(), '4');
  await fireEvent.changeText(screen.getByLabelText(t('exerciseSetup.foot_position.label')), 'high');
  await fireEvent.press(screen.getByRole('button', { name: t('demo.save') }));
  expect(mockSave).toHaveBeenCalledWith('leg_press', { seat_height: '4', foot_position: 'high' });
  expect(await screen.findByText(t('demo.saved'))).toBeOnTheScreen();
  await screen.unmount();
  await show();
  expect((await screen.findByLabelText(t('exerciseSetup.seat_height.label'))).props.value).toBe('4');
});

test('no clips yet: said so; the tips for the move; the muscles it works', async () => {
  await show();
  expect(await screen.findByText(t('demo.clipsPending'))).toBeOnTheScreen();
  expect(screen.getByText(t('demo.tip.fullRange'))).toBeOnTheScreen();
  expect(screen.getByText(t('demo.tip.lastRep'))).toBeOnTheScreen();
  expect(screen.getByText(`${t('demo.muscle.quads')}, ${t('demo.muscle.glutes')}`)).toBeOnTheScreen();
});

test('a move with nothing to set: no setup card; an isolation move: no last-rep tip', async () => {
  mockParams = { exercise: 'lateral_raise' };
  await show();
  expect(await screen.findByText(t('demo.tip.tempo'))).toBeOnTheScreen();
  expect(screen.queryByText(t('demo.setup'))).toBeNull();
  expect(screen.queryByText(t('demo.tip.lastRep'))).toBeNull();
});

test('a move not in the catalog on this phone says so', async () => {
  mockParams = { exercise: 'zercher_squat' };
  await show();
  expect(await screen.findByText(t('demo.unknown'))).toBeOnTheScreen();
});

test("the user's own move: its name and the tips for its kind; no muscles were asked of it, none said", async () => {
  mockOwn = [
    { id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] },
  ];
  mockParams = { exercise: 'custom:1' };
  await show();
  expect(await screen.findByText('Landmine press')).toBeOnTheScreen();
  expect(screen.getByText(t('demo.tip.lastRep'))).toBeOnTheScreen();
  expect(screen.queryByText(t('demo.muscles'))).toBeNull();
  expect(screen.queryByText(t('demo.unknown'))).toBeNull();
});

test('one field changed of a saved setup: the others are kept; "Saved." goes at the next change', async () => {
  mockSetups = { leg_press: { seat_height: '4', foot_position: 'high' } };
  await show();
  await fireEvent.changeText(await screen.findByLabelText(t('exerciseSetup.foot_position.label')), 'low');
  await fireEvent.press(screen.getByRole('button', { name: t('demo.save') }));
  expect(mockSave).toHaveBeenCalledWith('leg_press', { seat_height: '4', foot_position: 'low' });
  expect(await screen.findByText(t('demo.saved'))).toBeOnTheScreen();
  await fireEvent.changeText(seat(), '5');
  expect(screen.queryByText(t('demo.saved'))).toBeNull();
});

test('a save that fails says nothing of being saved, and is reported', async () => {
  mockSave.mockImplementationOnce(async () => {
    throw new Error('disk');
  });
  await show();
  await fireEvent.changeText(await screen.findByLabelText(t('exerciseSetup.seat_height.label')), '4');
  await fireEvent.press(screen.getByRole('button', { name: t('demo.save') }));
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'Error' });
  expect(screen.queryByText(t('demo.saved'))).toBeNull();
});

test('a back move and an own move: no clips promised to an own move, none filmed for it', async () => {
  mockOwn = [
    { id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] },
  ];
  mockParams = { exercise: 'custom:1' };
  await show();
  expect(await screen.findByText('Landmine press')).toBeOnTheScreen();
  expect(screen.queryByText(t('demo.clipsPending'))).toBeNull();
});

test('every muscle the catalog may name has its words; the back muscles are muscles of the catalog', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const path = jest.requireActual<typeof import('node:path')>('node:path');
  const text = fs.readFileSync(path.join(__dirname, '../../../../data/muscles.yaml'), 'utf8');
  const muscles = [...text.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]);
  expect(muscles.length).toBeGreaterThan(0);
  expect(muscles.filter((m) => t(`demo.muscle.${m}`).startsWith('[missing'))).toEqual([]);
  expect(workoutParams.backMuscles.filter((m) => !muscles.includes(m))).toEqual([]);
});

test('the muscle map: front and back, the move\'s areas marked; a move with no muscles has none', async () => {
  await show();
  await screen.findByText(t('demo.tip.tempo'));
  const sides = mockBody.mock.calls.map(([props]) => props.side);
  expect(new Set(sides)).toEqual(new Set(['front', 'back']));
  expect(mockBody.mock.calls.at(-1)?.[0].data.map((d) => d.slug)).toEqual(['quadriceps', 'gluteal']);
  expect(screen.getByLabelText(t('demo.mapLabel', { muscles: `${t('demo.muscle.quads')}, ${t('demo.muscle.glutes')}` }))).toBeOnTheScreen();
});

test('every catalog muscle has an area on the drawing', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const path = jest.requireActual<typeof import('node:path')>('node:path');
  const text = fs.readFileSync(path.join(__dirname, '../../../../data/muscles.yaml'), 'utf8');
  const muscles = [...text.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]);
  expect(muscles.filter((m) => (workoutParams.muscleMapAreas[m] ?? []).length === 0)).toEqual([]);
});
