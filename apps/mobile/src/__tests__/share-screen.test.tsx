/**
 * Share (K-975, ADR-076; prototype `#share`): started by the user from the end of a workout (or from Progress), never
 * offered on its own. The sticker is made on this phone from what the server says (the workout's summary, the weeks, the
 * lifts), on the user's own photo, a dark ground or nothing ("In Instagram"), and handed to the share sheet as an image.
 * Nothing goes to the server: the screen only reads (GET), and the image is never sent by the app.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ShareScreen from '@/app/share';
import { t } from '@/copy';
import { discardBackground, pickBackground } from '@/share/background';
import type { Sticker } from '@/share/stickers';
import { ThemeProvider } from '@/theme/theme';
import type { WorkoutSummaryRead } from '@/train/workoutEnd';

type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const none: Answer = { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) };
const broken: Answer = { error: { code: 'INTERNAL', message: 'x' }, response: new Response(null, { status: 500 }) };

let mockAnswers: Record<string, Answer> = {};
let mockEnd: WorkoutSummaryRead = { kind: 'pending' };
const PROGRAM = { days: [{ id: 'day-a', nameKey: 'programDays.full_body_a.name', exercises: [] }] };
let mockUnits = 'METRIC';
let mockParams: Record<string, string> = { workout: 'w1' };
const mockServices = {
  api: {
    GET: jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? none),
    POST: jest.fn(),
    PUT: jest.fn(),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  },
  training: {
    read: jest.fn(async () => ({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false })),
    own: jest.fn(async () => []),
  },
  shareImage: jest.fn(async (_base64: string) => {}),
  // What the end screen also reads (the Watch's energy, K-974): the stickers use none of it, so none may be touched.
  queue: { drain: jest.fn(async () => undefined) },
  workoutRecords: jest.fn(async () => [
    { seq: 1, clientId: 'w1', kind: 'workout', parentClientId: null, body: { clientId: 'w1', startedAt: '2026-10-13T08:00:00Z', programDayId: 'day-a' }, state: 'SYNCED', serverId: 'srv-w1', serverBody: null, errorCode: null },
    { seq: 2, clientId: 'f1', kind: 'finish', parentClientId: 'w1', body: { endedAt: '2026-10-13T08:52:00Z' }, state: 'SYNCED', serverId: null, serverBody: null, errorCode: null },
  ]),
  health: { readWatchActiveEnergy: jest.fn(async () => 310) },
  consents: { granted: jest.fn(async () => true) },
  // The app's own progress photos (K-614): the picker has no way to reach them, and this screen never asks.
  photos: { list: jest.fn(), read: jest.fn() },
  report: jest.fn(),
};
jest.mock('@/share/background', () => ({ pickBackground: jest.fn(), discardBackground: jest.fn() }));
const mockPick = pickBackground as jest.Mock;
const mockDiscard = discardBackground as jest.Mock;
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));
jest.mock('@/train/workoutEnd', () => ({ loadWorkoutSummary: jest.fn(async () => mockEnd) }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, []),
}));
// The sticker as text, with the image the ref would make: the real drawing is share-sticker-view.test.tsx.
let mockDataUrl: string | undefined = 'iVBORw0KGgo=';
jest.mock('@/share/Sticker', () => {
  const { forwardRef: mockForwardRef, useImperativeHandle: mockHandle } = jest.requireActual<typeof import('react')>('react');
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    StickerImage: mockForwardRef(function MockSticker({ sticker, backdrop }: { sticker: Sticker; backdrop?: { kind: string; uri?: string } }, ref) {
      mockHandle(ref, () => ({ toDataURL: (done: (base64?: string) => void) => done(mockDataUrl) }));
      return (
        <>
          <MockText testID="sticker">{[sticker.kicker, sticker.title, ...sticker.stats.flatMap((s) => [s.value, s.label]), ...sticker.lines].join('\n')}</MockText>
          <MockText testID="backdrop">{backdrop === undefined ? 'none' : `${backdrop.kind} ${backdrop.uri ?? ''}`.trim()}</MockText>
        </>
      );
    }),
  };
});

const READY: WorkoutSummaryRead = {
  kind: 'ready',
  summary: {
    workoutId: 'w1',
    liftedKg: 4280,
    workingSets: 14,
    minutes: 52,
    marks: [{ exerciseId: 'squat', kind: 'RECORD', loadKg: 100, reps: 8 }],
    moves: [],
    weekOf: '2026-10-12',
    muscles: [],
  },
  programDayId: 'day-a',
};
const CONSISTENCY = {
  weekOf: '2026-10-12',
  training: { done: 3, planned: 3 },
  protein: { done: 5, planned: 7 },
  steps: { done: 5, planned: 7 },
  weighIns: { done: 6, planned: 7 },
  planned: 24,
  done: 18,
  record: { onTrackWeeks: 11, countedWeeks: 12, currentRun: 4, forgivenWeeks: 1 },
  weeks: [{ weekOf: '2026-09-28', state: 'ON_TRACK' }],
};
const lift = { exerciseId: 'squat', baseline: { loadKg: 80, reps: 8, day: '2026-07-13' }, best: { loadKg: 100, reps: 8, day: '2026-10-12' }, stronger: true, weeks: [] };
const PROGRESS = { weekOf: '2026-10-12', muscles: [], lifts: [lift], strongerLifts: 1, trackedLifts: 1 };

const fetchSpy = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchSpy;
  mockEnd = READY;
  mockUnits = 'METRIC';
  mockParams = { workout: 'w1' };
  mockDataUrl = 'iVBORw0KGgo=';
  mockPick.mockResolvedValue(null);
  mockAnswers = { '/v1/consistency': ok(CONSISTENCY), '/v1/training-progress': ok(PROGRESS) };
});
afterEach(() => {
  // The image never goes to the server: no write of any kind, no fetch of its own.
  for (const write of [mockServices.api.POST, mockServices.api.PUT, mockServices.api.PATCH, mockServices.api.DELETE]) expect(write).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(mockServices.photos.list).not.toHaveBeenCalled();
  expect(mockServices.photos.read).not.toHaveBeenCalled();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <ShareScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const sticker = () => screen.getByTestId('sticker').props.children as string;
const chip = (kind: string) => screen.getByRole('button', { name: t(`share.kind.${kind}`) });
const background = (name: string) => screen.getByRole('button', { name: t(`share.background.${name}`) });
const backdrop = () => screen.getByTestId('backdrop').props.children as string;

test('from a workout: the four stickers to pick from, the workout first, its words in the preview', async () => {
  await show();

  expect(['workout', 'pr', 'streak', 'progress'].map((k) => chip(k).props.accessibilityState?.selected)).toEqual([true, false, false, false]);
  expect(sticker()).toContain(t('programDays.full_body_a.name'));
  expect(sticker()).toContain('52');
  expect(screen.getByText(t('share.note'))).toBeOnTheScreen();
});

test('picking a sticker shows its words and marks it picked', async () => {
  await show();

  await fireEvent.press(chip('streak'));
  expect(sticker()).toContain(t('share.sticker.streak.title', { onTrack: 11, counted: 12 }));
  expect(chip('streak').props.accessibilityState?.selected).toBe(true);
  expect(chip('workout').props.accessibilityState?.selected).toBe(false);

  await fireEvent.press(chip('progress'));
  expect(sticker()).toContain(t('share.sticker.progress.inWeeks.other', { count: 12 }));
  await fireEvent.press(chip('pr'));
  expect(sticker()).toContain(t('share.sticker.pr.best'));
});

test('from Progress (no workout): the weeks and the lifts only; no workout, no PR', async () => {
  mockParams = {};
  await show();

  expect(screen.queryByRole('button', { name: t('share.kind.workout') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('share.kind.pr') })).toBeNull();
  expect(chip('streak').props.accessibilityState?.selected).toBe(true);
  expect(chip('progress')).toBeTruthy();
});

test('Share makes the PNG on the phone and hands it to the sheet once; the button waits for the sheet', async () => {
  let close: () => void = () => {};
  mockServices.shareImage.mockImplementationOnce(() => new Promise<void>((resolve) => (close = resolve)));
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  expect(mockServices.shareImage).toHaveBeenCalledTimes(1);
  expect(mockServices.shareImage).toHaveBeenCalledWith('iVBORw0KGgo=');
  expect(screen.getByRole('button', { name: t('share.share') }).props.accessibilityState?.disabled).toBe(true);

  await act(async () => close());
  expect(screen.getByRole('button', { name: t('share.share') }).props.accessibilityState?.disabled).toBe(false);
});

test('a share that fails says so by name only, and trying again clears it', async () => {
  mockServices.shareImage.mockRejectedValueOnce(Object.assign(new Error('weights'), { name: 'ShareFailed' }));
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await act(async () => {});
  expect(screen.getByText(t('share.failed'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'ShareFailed' });
  expect(JSON.stringify(mockServices.report.mock.calls)).not.toContain('weights');

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await act(async () => {});
  expect(mockServices.shareImage).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(t('share.failed'))).toBeNull();
});

test('an image the drawing could not make (empty): said, nothing handed to the sheet, the button free again', async () => {
  mockDataUrl = undefined;
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
  await act(async () => {});

  expect(mockServices.shareImage).not.toHaveBeenCalled();
  expect(screen.getByText(t('share.failed'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('share.share') }).props.accessibilityState?.disabled).toBe(false);
});

test("the workout's numbers are not yet on the server: said calmly, the weeks and lifts still offered", async () => {
  mockEnd = { kind: 'pending' };
  await show();

  expect(screen.getByText(t('workoutEnd.pending'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('share.kind.workout') })).toBeNull();
  expect(chip('streak').props.accessibilityState?.selected).toBe(true);
});

test('a part the server could not give (offline): said, the rest offered', async () => {
  mockAnswers = { '/v1/consistency': broken, '/v1/training-progress': ok(PROGRESS) };
  await show();

  expect(screen.getByText(t('share.partial'))).toBeOnTheScreen();
  expect(chip('workout')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('share.kind.streak') })).toBeNull();
});

test('a workout read that throws: said as a part missing, the rest still offered, nothing blank', async () => {
  const { loadWorkoutSummary } = jest.requireMock('@/train/workoutEnd') as { loadWorkoutSummary: jest.Mock };
  loadWorkoutSummary.mockRejectedValueOnce(Object.assign(new Error('boom'), { name: 'DbError' }));
  await show();

  expect(screen.getByText(t('share.partial'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('share.kind.workout') })).toBeNull();
  expect(chip('streak')).toBeTruthy();
});

test('nothing yet to share: said, and no Share button', async () => {
  mockParams = {};
  mockAnswers = {};
  await show();

  expect(screen.getByText(t('share.nothing'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('share.share') })).toBeNull();
});

test("in pounds when that is the user's unit", async () => {
  mockUnits = 'IMPERIAL';
  await show();

  expect(sticker()).toContain(t('workoutEnd.liftedLb'));
});

test('the workout is read by the id it came with; the weeks and lifts from the server; the moves from the program', async () => {
  const { loadWorkoutSummary } = jest.requireMock('@/train/workoutEnd') as { loadWorkoutSummary: jest.Mock };
  await show();

  expect(loadWorkoutSummary).toHaveBeenCalledWith(mockServices, 'w1');
  expect(mockServices.api.GET.mock.calls.map(([path]) => path).sort()).toEqual(['/v1/consistency', '/v1/training-progress']);
  expect(mockServices.training.read).toHaveBeenCalled();
});

test("the stickers read no health data: with the real reading, the Watch's energy and the consents are never touched, and only what is needed is asked", async () => {
  const { loadWorkoutSummary } = jest.requireMock('@/train/workoutEnd') as { loadWorkoutSummary: jest.Mock };
  loadWorkoutSummary.mockImplementationOnce(jest.requireActual<typeof import('@/train/workoutEnd')>('@/train/workoutEnd').loadWorkoutSummary);
  mockAnswers['/v1/workouts/{id}/summary'] = ok((READY as { summary: unknown }).summary);
  await show();

  expect(sticker()).toContain(t('programDays.full_body_a.name'));
  expect(mockServices.health.readWatchActiveEnergy).not.toHaveBeenCalled();
  expect(mockServices.consents.granted).not.toHaveBeenCalled();
  // The summary once, the weeks once, the lifts once: nothing twice.
  expect(mockServices.api.GET.mock.calls.map(([path]) => path).sort()).toEqual(['/v1/consistency', '/v1/training-progress', '/v1/workouts/{id}/summary']);
});

describe('the background', () => {
  test('four to pick from, a dark ground to begin with (a whole image for any place it goes)', async () => {
    await show();

    expect(['gallery', 'camera', 'dark', 'instagram'].map((b) => background(b).props.accessibilityState?.selected)).toEqual([false, false, true, false]);
    expect(backdrop()).toBe('dark');
  });

  test("the gallery: the user's photo is the ground; the picker is asked for it by name", async () => {
    mockPick.mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/a.jpg' });
    await show();

    await fireEvent.press(background('gallery'));
    await act(async () => {});

    expect(mockPick).toHaveBeenCalledWith('gallery');
    expect(backdrop()).toBe('photo file:///cache/ImagePicker/a.jpg');
    expect(background('gallery').props.accessibilityState?.selected).toBe(true);
    expect(background('dark').props.accessibilityState?.selected).toBe(false);
  });

  test('the camera takes the photo the same way', async () => {
    mockPick.mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/b.jpg' });
    await show();

    await fireEvent.press(background('camera'));
    await act(async () => {});

    expect(mockPick).toHaveBeenCalledWith('camera');
    expect(backdrop()).toBe('photo file:///cache/ImagePicker/b.jpg');
  });

  test('a picker closed without a photo changes nothing', async () => {
    await show();

    await fireEvent.press(background('gallery'));
    await act(async () => {});

    expect(backdrop()).toBe('dark');
    expect(background('dark').props.accessibilityState?.selected).toBe(true);
  });

  test("a camera that is not allowed: said, with the way out, and the ground stays", async () => {
    mockPick.mockResolvedValueOnce('denied');
    await show();

    await fireEvent.press(background('camera'));
    await act(async () => {});

    expect(screen.getByText(t('share.denied'))).toBeOnTheScreen();
    expect(backdrop()).toBe('dark');
  });

  test('a picker that fails: said by name only, the ground stays', async () => {
    mockPick.mockRejectedValueOnce(Object.assign(new Error('/private/var/IMG_1.jpg'), { name: 'PickerFailed' }));
    await show();

    await fireEvent.press(background('gallery'));
    await act(async () => {});

    expect(screen.getByText(t('share.photoFailed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'PickerFailed' });
    expect(JSON.stringify(mockServices.report.mock.calls)).not.toContain('IMG_1');
    expect(backdrop()).toBe('dark');
  });

  test('"In Instagram": the sticker alone, and what that means', async () => {
    await show();

    await fireEvent.press(background('instagram'));

    expect(backdrop()).toBe('none');
    expect(screen.getByText(t('share.instagramNote'))).toBeOnTheScreen();
  });

  test("a photo is shared like any ground: once, made on the phone", async () => {
    mockPick.mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/a.jpg' });
    await show();
    await fireEvent.press(background('gallery'));
    await act(async () => {});

    await fireEvent.press(screen.getByRole('button', { name: t('share.share') }));
    await act(async () => {});

    expect(mockServices.shareImage).toHaveBeenCalledTimes(1);
    expect(mockServices.shareImage).toHaveBeenCalledWith('iVBORw0KGgo=');
  });

  test("the picker's copy of a photo is removed when another ground replaces it, and when the screen closes", async () => {
    mockPick.mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/a.jpg' }).mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/b.jpg' });
    const { unmount } = await render(
      <ThemeProvider scheme="light">
        <ShareScreen />
      </ThemeProvider>,
    );
    await act(async () => {});

    await fireEvent.press(background('gallery'));
    await act(async () => {});
    expect(mockDiscard).not.toHaveBeenCalled();

    await fireEvent.press(background('camera'));
    await act(async () => {});
    expect(mockDiscard).toHaveBeenCalledTimes(1);
    expect(mockDiscard).toHaveBeenLastCalledWith('file:///cache/ImagePicker/a.jpg');

    await fireEvent.press(background('dark'));
    expect(mockDiscard).toHaveBeenLastCalledWith('file:///cache/ImagePicker/b.jpg');

    await unmount();
    expect(mockDiscard).toHaveBeenCalledTimes(2); // nothing left to remove at the end
  });

  test('a photo still held when the screen closes is removed then', async () => {
    mockPick.mockResolvedValueOnce({ uri: 'file:///cache/ImagePicker/a.jpg' });
    const { unmount } = await render(
      <ThemeProvider scheme="light">
        <ShareScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
    await fireEvent.press(background('gallery'));
    await act(async () => {});

    await unmount();

    expect(mockDiscard).toHaveBeenCalledWith('file:///cache/ImagePicker/a.jpg');
  });
});
