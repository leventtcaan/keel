/**
 * A move's screen (K-418, ADR-017): the setup first — seat, pad, grip, kept on this phone —, then the demo clips (not
 * filmed yet: said so, nothing in their place), Güray's tips for the move, and the muscles it works.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ExerciseScreen from '@/app/exercise';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { Move, TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

let mockParams: { exercise?: string } = {};
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
