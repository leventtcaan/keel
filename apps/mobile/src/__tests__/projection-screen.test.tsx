/**
 * The shape projection screen (K-606, U12, ADR-050, ADR-052): off unless turned on; turning it on asks the SCOFF questions
 * first, and after "off" there it cannot be turned on. On, it reads the server's numbers and draws a faceless figure toward
 * the goal, three scenarios as ranges, and says an update without blame, with two ways from there.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ProgressScreen from '@/app/(tabs)/progress';
import ProjectionScreen from '@/app/projection';
import type { components } from '@/api/schema';
import * as fs from 'fs';
import * as path from 'path';

import { has, t } from '@/copy';
import { createProjectionSwitch } from '@/projection/projection';
import { type ProjectionAccess, createProjectionAccess } from '@/projection/scoff';
import { ThemeProvider } from '@/theme/theme';

type Projection = components['schemas']['Projection'];

const mockPush = jest.fn();
let mockFocus: (() => void) | null = null;
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    mockFocus = effect;
  },
}));
let mockAnswer: Projection = { shown: false, reason: 'TOO_EARLY' };
const mockGET = jest.fn(async () => ({ data: mockAnswer, response: new Response(null, { status: 200 }) }));
let mockServices: Record<string, unknown> = {};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

let stored: Map<string, string>;
let removalFails = false;
const kv = {
  getItemAsync: async (key: string) => stored.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    stored.set(key, value);
  },
  removeItemAsync: async (key: string) => {
    if (removalFails) throw Object.assign(new Error('disk'), { name: 'StorageFailed' });
    return stored.delete(key);
  },
};

const SHOWN: Projection = {
  shown: true,
  todayKg: 90,
  direction: 'LOSS',
  on: '2027-04-04',
  scenarios: [
    { adherence: 0.6, lowKg: 82.1, kg: 85.6, highKg: 89.0 },
    { adherence: 0.8, lowKg: 80.6, kg: 84.1, highKg: 87.5 },
    { adherence: 0.95, lowKg: 79.5, kg: 83.0, highKg: 86.4 },
  ],
};

const mockReport = jest.fn();

async function show() {
  const access = await createProjectionAccess({ kv, locale: 'en-US' });
  mockServices = { api: { GET: mockGET }, report: mockReport, projection: access, projectionSwitch: await createProjectionSwitch({ kv, access }) };
  await render(
    <ThemeProvider scheme="light">
      <ProjectionScreen />
    </ThemeProvider>,
  );
  await focus();
}

async function focus() {
  await act(async () => {
    mockFocus?.();
  });
}

async function flip() {
  await act(async () => {
    fireEvent(screen.getByLabelText(t('projection.view.switch')), 'valueChange', true);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  stored = new Map();
  removalFails = false;
  mockFocus = null;
  mockAnswer = SHOWN;
});

test('off unless turned on: nothing is read', async () => {
  await show();

  expect(screen.getByLabelText(t('projection.view.switch')).props.value).toBe(false);
  expect(screen.getByText(t('projection.view.offNote'))).toBeOnTheScreen();
  expect(mockGET).not.toHaveBeenCalled();
});

test('turning it on asks the SCOFF questions first; back with "clear", it is on and read', async () => {
  await show();
  await flip();

  expect(mockPush).toHaveBeenCalledWith('/scoff');
  expect(mockGET).not.toHaveBeenCalled();

  // The SCOFF screen records "clear" on the same access, then closes.
  await (mockServices.projection as ProjectionAccess).record('clear');
  await focus();

  expect(mockGET).toHaveBeenCalledWith('/v1/projection');
  expect(screen.getByLabelText(t('projection.view.switch')).props.value).toBe(true);
});

test('back from the questions with "off": it stays off and cannot be turned on', async () => {
  stored.set('projection.access', 'unavailable');
  await show();

  expect(screen.getByText(t('projection.view.unavailable'))).toBeOnTheScreen();
  expect(screen.getByLabelText(t('projection.view.switch')).props.disabled).toBe(true);
  expect(mockGET).not.toHaveBeenCalled();
});

test('on: the figure, three scenarios as ranges by the date, and the calculation said for what it is', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  await show();

  expect(screen.getByTestId('projection-figure')).toBeOnTheScreen();
  for (const pct of [60, 80, 95]) expect(screen.getByText(t('projection.view.scenario', { pct }))).toBeOnTheScreen();
  expect(screen.getByText(`${t('format.range', { low: 80.6, high: 87.5 })} ${t('units.kgUnit')}`)).toBeOnTheScreen();
  expect(screen.getAllByText(t('projection.view.by', { date: 'Sun, Apr 4' }))).toHaveLength(3);
  expect(screen.getByText(t('projection.view.disclaimer'))).toBeOnTheScreen();
  // An estimate is a range (U5): the figure's caption names the behaviour, never a single weight.
  expect(screen.queryByText(/84\.1/)).toBeNull();
  expect(screen.getByText(t('projection.view.at', { pct: 80 }))).toBeOnTheScreen();
});

test('a kept "on" without the questions answered "clear" is off: nothing read, nothing drawn', async () => {
  for (const gate of [null, 'unavailable']) {
    stored = new Map([['projection.on', 'true'], ...(gate === null ? [] : [['projection.access', gate] as [string, string]])]);
    await show();
    expect(screen.getByLabelText(t('projection.view.switch')).props.value).toBe(false);
    expect(screen.queryByTestId('projection-figure')).toBeNull();
  }
  expect(mockGET).not.toHaveBeenCalled();
});

test('turning it off when the phone cannot forget: said, reported by name, still on', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  await show();
  removalFails = true;

  await act(async () => {
    fireEvent(screen.getByLabelText(t('projection.view.switch')), 'valueChange', false);
  });

  expect(screen.getByText(t('projection.view.saveFailed'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith({ name: 'StorageFailed' });
  expect(screen.getByLabelText(t('projection.view.switch')).props.value).toBe(true);
});

test('not shown: the reason in plain words', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  mockAnswer = { shown: false, reason: 'TOO_EARLY' };
  await show();

  expect(screen.getByText(t('projection.view.reason.TOO_EARLY'))).toBeOnTheScreen();
  expect(screen.queryByTestId('projection-figure')).toBeNull();
});

test('an update away from the goal: said as the model, with two ways from there', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  stored.set('projection.last', JSON.stringify({ adherence: 0.8, kg: 83.0, low: 79.5, high: 86.4 }));
  await show();

  const from = `${t('format.range', { low: 79.5, high: 86.4 })} ${t('units.kgUnit')}`;
  const to = `${t('format.range', { low: 80.6, high: 87.5 })} ${t('units.kgUnit')}`;
  expect(screen.getByText(t('projection.view.updated', { from, to }))).toBeOnTheScreen();
  expect(screen.getByText(t('projection.view.options'))).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByText(t('projection.view.off')));
  });
  expect(screen.getByLabelText(t('projection.view.switch')).props.value).toBe(false);
  expect(stored.has('projection.on')).toBe(false);
  expect(stored.has('projection.last')).toBe(false);
});

test('an update toward the goal is said, with no options to pick', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  stored.set('projection.last', JSON.stringify({ adherence: 0.8, kg: 85.1, low: 81.6, high: 88.5 }));
  await show();

  expect(screen.getByText(/^Updated with your latest weeks/)).toBeOnTheScreen();
  expect(screen.queryByText(t('projection.view.options'))).toBeNull();
  expect(JSON.parse(stored.get('projection.last') ?? '')).toEqual({ adherence: 0.8, kg: 84.1, low: 80.6, high: 87.5 });
});

test('turned off: what was shown is forgotten and nothing more is read', async () => {
  stored.set('projection.access', 'clear');
  stored.set('projection.on', 'true');
  await show();
  mockGET.mockClear();

  await act(async () => {
    fireEvent(screen.getByLabelText(t('projection.view.switch')), 'valueChange', false);
  });
  await focus();

  expect(stored.has('projection.last')).toBe(false);
  expect(screen.queryByTestId('projection-figure')).toBeNull();
  expect(mockGET).not.toHaveBeenCalled();
});

test('Progress leads to it', async () => {
  mockServices = { api: { GET: mockGET } };
  await render(
    <ThemeProvider scheme="light">
      <ProgressScreen />
    </ThemeProvider>,
  );

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: t('projection.view.title') }));
  });
  expect(mockPush).toHaveBeenCalledWith('/projection');
});

test('every reason the contract can give has words', () => {
  const contract = fs.readFileSync(path.resolve(__dirname, '../../../../contracts/openapi.yaml'), 'utf8');
  const reasons = /enum: \[(UNDER_AGE[^\]]*)\]/.exec(contract)?.[1].split(',').map((reason) => reason.trim()) ?? [];

  expect(reasons).toContain('OUTSIDE_MODEL');
  reasons.forEach((reason) => expect(has(`projection.view.reason.${reason}`)).toBe(true));
});
