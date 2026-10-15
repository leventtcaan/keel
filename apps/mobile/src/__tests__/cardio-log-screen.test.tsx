/**
 * "+ > Cardio" (K-980, ADR-074 #6, Ek 2; prototype "+" sheet): the minutes of a cardio session, nothing else — no pace
 * (#6). The minutes start at the program's own (`Program.cardio.minutes`). A day that has a record already is not asked
 * again: the record is shown (the typed one first; Apple Health's is the watch's and stays). A typed record is taken back
 * with Undo: deleted on the server by its id and the same clientId's waiting send dropped (ADR-074 Ek 2), a 404 meaning
 * it was gone already. It is training, not health data: no consent stands in the way.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import CardioScreen from '@/app/cardio';
import { t } from '@/copy';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import { workoutParams } from '@/train/params';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const cardio = (over: Partial<Schemas['ProgramCardio']> = {}): Schemas['ProgramCardio'] => ({
  source: 'GENERATED',
  minutes: 30,
  sessionsPerWeek: 3,
  sessions: [],
  doneThisWeek: 0,
  afterLiftOverLine: false,
  ...over,
});
const session = (over: Partial<Schemas['CardioSession']> = {}): Schemas['CardioSession'] => ({
  id: 'srv-1',
  clientId: 'c-1',
  day: '2026-09-29',
  minutes: 30,
  source: 'MANUAL',
  ...over,
});

let mockCardio: Schemas['ProgramCardio'] | undefined = cardio();
let mockKept = false;
let mockRecords: LocalRecord[] = [];
let seq = 0;
const toLocal = (record: { kind: string; body: { clientId: string } }): LocalRecord => ({
  seq: ++seq,
  clientId: record.body.clientId,
  kind: record.kind,
  parentClientId: null,
  body: record.body,
  state: 'PENDING',
  serverId: null,
  serverBody: null,
  errorCode: null,
});
const mockBack = jest.fn();
const mockServices = {
  api: { DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })) },
  training: {
    read: jest.fn(async (): Promise<TrainData> => ({
      program: { state: 'ready', value: { id: 'p', source: 'GENERATED', days: [], ...(mockCardio === undefined ? {} : { cardio: mockCardio }) } },
      exercises: { state: 'none' },
      kept: mockKept,
    })),
  },
  workoutRecords: async () => mockRecords,
  queue: {
    record: jest.fn(async (record: { kind: string; body: { clientId: string } }) => {
      mockRecords = [...mockRecords, toLocal(record)];
      return true;
    }),
  },
  takeBack: jest.fn(async (clientId: string, remove: (serverId: string) => Promise<number>, known?: string): Promise<'taken' | 'conflict' | 'offline'> => {
    if (known !== undefined) await remove(known);
    mockRecords = mockRecords.filter((r) => r.clientId !== clientId);
    mockCardio = mockCardio === undefined ? undefined : { ...mockCardio, loggedToday: undefined };
    return 'taken';
  }),
  report: jest.fn(),
};
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
  // Tuesday 29 Sep 2026 on the phone's calendar; only the date is fake.
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 9, 0), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'] });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockCardio = cardio();
  mockKept = false;
  mockRecords = [];
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CardioScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string | RegExp) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const logged = (minutes: number) => t('workout.cardio.loggedSaid', { minutes });

describe('asking for the minutes', () => {
  test('the program\'s own minutes, a step of them at a time, and Log keeps them as a typed session of today', async () => {
    await show();
    expect(screen.getByText(t('train.cardioMinutes', { minutes: 30 }))).toBeOnTheScreen();

    await press(t('programEditor.moreLabel', { what: t('editProgram.cardio.minutesLabel') }));
    expect(screen.getByText(t('train.cardioMinutes', { minutes: 30 + workoutParams.cardioMinutesStep }))).toBeOnTheScreen();

    await press(t('cardioLog.log'));

    expect(mockServices.queue.record).toHaveBeenCalledWith({
      kind: 'cardio',
      body: { clientId: expect.any(String), day: '2026-09-29', minutes: 30 + workoutParams.cardioMinutesStep, source: 'MANUAL' },
    });
    expect(screen.getByText(logged(30 + workoutParams.cardioMinutesStep))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
  });

  test('no pace to enter, no calories to enter: minutes only (ADR-074 #6)', async () => {
    await show();
    expect(screen.queryByText(/pace|speed|kcal|calorie/i)).toBeNull();
    expect(screen.queryByLabelText(/pace|speed/i)).toBeNull();
  });

  test('a program with no cardio (very active work): the start the coaching rules give', async () => {
    mockCardio = undefined;
    await show();
    expect(screen.getByText(t('train.cardioMinutes', { minutes: workoutParams.cardioMinutesStart }))).toBeOnTheScreen();
  });

  test('the number never goes under one step or over what the server takes', async () => {
    mockCardio = cardio({ minutes: workoutParams.cardioMinutesStep });
    await show();
    expect(screen.getByRole('button', { name: t('programEditor.lessLabel', { what: t('editProgram.cardio.minutesLabel') }) })).toBeDisabled();
  });

  test('slow network: what was just kept is shown at once, so there is no Log to tap a second time while the read comes back', async () => {
    await show();
    let release: (data: TrainData) => void = () => {};
    mockServices.training.read.mockImplementationOnce(() => new Promise<TrainData>((resolve) => (release = resolve)));
    await press(t('cardioLog.log'));

    // the read after the save has not come back
    expect(screen.getByText(logged(30))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
    expect(mockServices.queue.record).toHaveBeenCalledTimes(1);

    await act(async () => release({ program: { state: 'ready', value: { id: 'p', source: 'GENERATED', days: [], cardio: cardio() } }, exercises: { state: 'none' }, kept: false }));
    expect(screen.getByText(logged(30))).toBeOnTheScreen();
    expect(mockServices.queue.record).toHaveBeenCalledTimes(1);
  });

  test('the optimistic record can be taken back at once', async () => {
    await show();
    mockServices.training.read.mockImplementationOnce(() => new Promise<TrainData>(() => {}));
    await press(t('cardioLog.log'));
    await press(t('workout.cardio.undoLabel'));
    expect(mockServices.takeBack).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
  });

  test('a read of the program that fails does not break the screen: it asks for the minutes', async () => {
    mockServices.training.read.mockRejectedValueOnce(new Error('offline'));
    await show();
    expect(screen.getByText(t('train.cardioMinutes', { minutes: workoutParams.cardioMinutesStart }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
  });

  test('a read of this phone\'s records that fails does not break it either', async () => {
    const original = mockServices.workoutRecords;
    mockServices.workoutRecords = async () => {
      throw new Error('disk');
    };
    await show();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
    mockServices.workoutRecords = original;
  });

  test('two taps at once keep one session', async () => {
    await show();
    const log = screen.getByRole('button', { name: t('cardioLog.log') });
    await fireEvent.press(log);
    await fireEvent.press(log);
    await act(async () => {});
    expect(mockServices.queue.record).toHaveBeenCalledTimes(1);
  });

  test('a session the phone could not keep says so and asks again', async () => {
    mockServices.queue.record.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
    await show();
    await press(t('cardioLog.log'));
    expect(screen.getByText(t('workout.cardio.failed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
  });
});

describe('today has a record already: it is shown, not asked again (K-1019)', () => {
  test('the server\'s typed record: its minutes and Undo; no Log', async () => {
    mockCardio = cardio({ loggedToday: session({ minutes: 45 }) });
    await show();
    expect(screen.getByText(logged(45))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
    expect(screen.getByRole('button', { name: t('workout.cardio.undoLabel') })).toBeOnTheScreen();
  });

  test('Apple Health\'s record: shown as the watch\'s, with its energy only when it measured; nothing to undo, nothing to log', async () => {
    mockCardio = cardio({ loggedToday: session({ source: 'APPLE_HEALTH', minutes: 40, activeEnergyKcal: 310 }) });
    await show();
    expect(screen.getByText(logged(40))).toBeOnTheScreen();
    expect(screen.getByText(t('cardioLog.fromHealth'))).toBeOnTheScreen();
    expect(screen.getByText(t('cardioLog.watch', { kcal: 310 }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('workout.cardio.undoLabel') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
  });

  test('Apple Health\'s record without a watch\'s reading: no energy line, none made up', async () => {
    mockCardio = cardio({ loggedToday: session({ source: 'APPLE_HEALTH', minutes: 40 }) });
    await show();
    expect(screen.queryByText(/kcal/)).toBeNull();
  });

  test('one just typed on this phone, not on the server yet, is today\'s too', async () => {
    mockRecords = [toLocal({ kind: 'cardio', body: { clientId: 'c-9', day: '2026-09-29', minutes: 25, source: 'MANUAL' } as never } as never)];
    await show();
    expect(screen.getByText(logged(25))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
  });

  test('a record of another day does not stand in for today\'s', async () => {
    mockRecords = [toLocal({ kind: 'cardio', body: { clientId: 'c-8', day: '2026-09-28', minutes: 25, source: 'MANUAL' } as never } as never)];
    await show();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
  });

  test('a copy of the program kept for offline does not say what is done today', async () => {
    mockKept = true;
    mockCardio = cardio({ loggedToday: session({ minutes: 45 }) });
    await show();
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
  });
});

describe('Undo (ADR-074 Ek 2)', () => {
  test('a typed record the server has: deleted by its id, its waiting send dropped; the screen asks again', async () => {
    mockCardio = cardio({ loggedToday: session({ minutes: 45 }) });
    await show();

    await press(t('workout.cardio.undoLabel'));

    expect(mockServices.takeBack).toHaveBeenCalledWith('c-1', expect.any(Function), 'srv-1');
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/cardio-sessions/{id}', { params: { path: { id: 'srv-1' } } });
    expect(screen.getByRole('button', { name: t('cardioLog.log') })).toBeOnTheScreen();
    expect(screen.queryByText(logged(45))).toBeNull();
  });

  test('just logged here: taken back by its clientId, and it can be logged again as a new one', async () => {
    await show();
    await press(t('cardioLog.log'));
    const [{ body }] = mockServices.queue.record.mock.calls[0] as [{ body: { clientId: string } }];

    await press(t('workout.cardio.undoLabel'));

    expect(mockServices.takeBack).toHaveBeenCalledWith(body.clientId, expect.any(Function), undefined);
    await press(t('cardioLog.log'));
    const ids = mockServices.queue.record.mock.calls.map(([record]) => record.body.clientId);
    expect(ids).toHaveLength(2);
    expect(ids[1]).not.toBe(ids[0]);
  });

  test('no way to reach the server: said, and the cardio stays logged', async () => {
    mockCardio = cardio({ loggedToday: session() });
    mockServices.takeBack.mockResolvedValueOnce('offline');
    await show();
    await press(t('workout.cardio.undoLabel'));
    expect(screen.getByText(t('cardioLog.undoFailed'))).toBeOnTheScreen();
    expect(screen.getByText(logged(30))).toBeOnTheScreen();
  });

  test('the server refuses (409): said, and the cardio stays logged', async () => {
    mockCardio = cardio({ loggedToday: session() });
    mockServices.takeBack.mockResolvedValueOnce('conflict');
    await show();
    await press(t('workout.cardio.undoLabel'));
    expect(screen.getByText(t('workout.cardio.undoLate'))).toBeOnTheScreen();
    expect(screen.getByText(logged(30))).toBeOnTheScreen();
  });

  test('the delete is the screen\'s to name: 404 is gone already, taken back', async () => {
    mockCardio = cardio({ loggedToday: session() });
    mockServices.takeBack.mockImplementationOnce(async (_clientId, remove, known) => {
      expect(await remove(known ?? '')).toBe(404);
      return 'taken';
    });
    mockServices.api.DELETE.mockResolvedValueOnce({ response: new Response(null, { status: 404 }) });
    await show();
    await press(t('workout.cardio.undoLabel'));
    expect(mockServices.takeBack).toHaveBeenCalled();
  });

  test('taken back and said to VoiceOver (K-815)', async () => {
    const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockCardio = cardio({ loggedToday: session() });
    await show();
    await press(t('workout.cardio.undoLabel'));
    expect(announced).toHaveBeenCalledWith(t('workout.cardio.undoneSaid'));
  });
});

test('Done leaves', async () => {
  await show();
  await press(t('cardioLog.done'));
  expect(mockBack).toHaveBeenCalled();
});
