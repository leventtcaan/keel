/**
 * Evre 7 final pass (#684, 30 Oct walk): "Saved Cardio 30 min · Undo" after Log on the cardio sheet. The banner's Undo must take
 * the session back exactly as the Undo inside the sheet does — through the real queue, store and takeBack, not a stand-in —
 * and the screens that read the week (This week, Progress) must read again (`useSavedChanges`).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, Text } from 'react-native';

import CardioScreen from '@/app/cardio';
import { t } from '@/copy';
import { useSavedChanges } from '@/saved/saved';
import { type Outbound, type SendResult, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';
import { createTakeBack } from '@/sync/takeBack';
import { ThemeProvider } from '@/theme/theme';

import { nodeSqlite } from './support/nodeSqlite';
import { WithSaved, banner, undoButton } from './support/saved';

const mockBack = jest.fn();
let mockServices: Record<string, unknown>;
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 9, 0), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'] });
});
afterAll(() => jest.useRealTimers());

/** What the tabs show of the week: it moves with every save and every save taken back. */
function Watcher() {
  return <Text testID="changes">{String(useSavedChanges())}</Text>;
}

async function setup(over: { deleteStatus?: number } = {}) {
  const store = await openRecordStore(nodeSqlite());
  const send = jest.fn(async (record: Outbound): Promise<SendResult> => ({ status: 201, id: 'srv-1', body: record.body }));
  const queue = createSyncQueue({ store, send, report: jest.fn() });
  const DELETE = jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: over.deleteStatus ?? 204 }) }));
  mockServices = {
    api: { DELETE },
    training: { read: jest.fn(async () => ({ program: { state: 'ready', value: { id: 'p', source: 'GENERATED', days: [], cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false } } }, exercises: { state: 'none' }, kept: false })) },
    workoutRecords: async () => store.all(),
    queue,
    takeBack: createTakeBack({ store, queue }),
    report: jest.fn(),
  };
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <CardioScreen />
        <Watcher />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
  return { store, queue, send, DELETE };
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const changes = () => Number(screen.getByTestId('changes').props.children);

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

test('Log, then the banner\'s Undo: the session is deleted on the server by its id, forgotten on the phone, the banner goes and the week reads again', async () => {
  const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const { store, queue, DELETE } = await setup();
  await press(t('cardioLog.log'));
  await queue.drain(); // the send finished: the server holds it under srv-1
  expect(banner()).toBeOnTheScreen();
  const before = changes();

  await fireEvent.press(undoButton());
  await act(async () => {});
  await act(async () => {});

  expect(DELETE).toHaveBeenCalledWith('/v1/cardio-sessions/{id}', { params: { path: { id: 'srv-1' } } });
  expect(await store.all()).toEqual([]);
  expect(banner()).toBeNull();
  expect(announced).toHaveBeenCalledWith(t('workout.cardio.undoneSaid'));
  expect(changes()).toBeGreaterThan(before);
});

test('Undo right after Log, while the send is still going: whatever the server has is deleted, nothing is left to write it again', async () => {
  const { store, queue, send, DELETE } = await setup();
  await press(t('cardioLog.log'));

  await fireEvent.press(undoButton());
  await act(async () => {});
  await act(async () => {});
  await queue.drain();

  expect(await store.all()).toEqual([]);
  expect(banner()).toBeNull();
  // Sent once at most, and if it was sent it was deleted: the server holds nothing.
  expect(DELETE.mock.calls.length).toBe(send.mock.calls.length);
});

test('the server cannot be reached for the delete: the session stays, the banner comes back with Undo and says why', async () => {
  const alerted = jest.spyOn(Alert, 'alert');
  alerted.mockClear();
  const { store, queue, DELETE } = await setup({ deleteStatus: 500 });
  await press(t('cardioLog.log'));
  await queue.drain();

  await fireEvent.press(undoButton());
  await act(async () => {});
  await act(async () => {});

  expect(DELETE).toHaveBeenCalled();
  expect((await store.all()).length).toBe(1);
  expect(alerted).toHaveBeenCalledWith(t('cardioLog.undoFailed'));
  expect(undoButton()).toBeOnTheScreen();
});
