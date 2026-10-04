/**
 * CaptureFlowTests (K-601, H1 §2.4, prototype 4.1): two photos, front then side, each lined up with the last one of its
 * pose (faded over the viewfinder), inside a frame guide, with a level from the accelerometer. A self-timer for a phone on
 * a stand. Where there is no camera (the simulator) or it is off, a photo can be chosen from the library. Every photo goes
 * to the phone's photo library (K-614) and nowhere else: neither the API client nor fetch is ever called.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import PhotoCaptureScreen from '@/app/photo-capture';
import { t } from '@/copy';
import type { PhotoCheck } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Permission = { granted: boolean; canAskAgain: boolean };
let mockPermission: Permission | null = { granted: true, canAskAgain: true };
let mockAnswer: Permission = { granted: true, canAskAgain: true };
const mockRequest = jest.fn();
const mockTake = jest.fn(async (_options: unknown) => ({ uri: 'file:///cache/Camera/shot.jpg', width: 3024, height: 4032 }));
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useCameraPermissions: () => {
      const [permission, setPermission] = React.useState<Permission | null>(mockPermission);
      const request = async () => {
        mockRequest();
        setPermission(mockAnswer);
        return mockAnswer;
      };
      return [permission, request];
    },
    CameraView: React.forwardRef(function CameraView(_props: object, ref: React.Ref<unknown>) {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTake }));
      return <View testID="camera" />;
    }),
  };
});

const mockPick = jest.fn(async (_options: unknown) => ({ canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/picked.jpg' }] }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (options: unknown) => mockPick(options) }));

let mockGravity: ((g: { x: number; y: number; z: number }) => void) | null = null;
const mockRemove = jest.fn();
const mockInterval = jest.fn();
let mockAvailable: () => Promise<boolean> = async () => true;
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: () => mockAvailable(),
    setUpdateInterval: (ms: number) => mockInterval(ms),
    addListener: (listener: (g: { x: number; y: number; z: number }) => void) => {
      mockGravity = listener;
      return { remove: mockRemove };
    },
  },
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));

let mockChecks: PhotoCheck[] = [];
const mockServices = {
  photos: {
    checks: jest.fn(async () => mockChecks),
    add: jest.fn(async (from: string, takenOn: string, pose: string) => ({ takenOn, pose, uri: `file:///docs/${takenOn}-${pose}.jpg`, from })),
  },
  report: jest.fn(),
  // Present so a call would be seen: a progress photo never goes through it.
  api: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), PATCH: jest.fn(), DELETE: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const fetchSpy = jest.fn();
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 7, 8, 0), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockPermission = { granted: true, canAskAgain: true };
  mockAnswer = { granted: true, canAskAgain: true };
  mockChecks = [];
  mockGravity = null;
  mockAvailable = async () => true;
  global.fetch = fetchSpy;
});
afterEach(() => {
  // V1: the photo never leaves the phone — no request of any kind.
  expect(fetchSpy).not.toHaveBeenCalled();
  for (const method of Object.values(mockServices.api)) expect(method).not.toHaveBeenCalled();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <PhotoCaptureScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};

test('front first: the frame guide, the words, the step', async () => {
  await show();
  expect(screen.getByText(t('capture.pose.front', { step: 1, total: 2 }))).toBeOnTheScreen();
  expect(screen.getByText(t('capture.guide'))).toBeOnTheScreen();
  expect(screen.getByText(t('capture.onPhone'))).toBeOnTheScreen();
  expect(screen.getByTestId('capture-frame')).toBeOnTheScreen();
  expect(screen.queryByTestId('capture-ghost')).toBeNull(); // no photo yet: nothing to line up with
});

test('the last photo of the same pose, faded over the viewfinder', async () => {
  mockChecks = [
    { takenOn: '2026-08-10', photos: { front: 'file:///docs/2026-08-10-front.jpg', side: 'file:///docs/2026-08-10-side.jpg' } },
    { takenOn: '2026-09-09', photos: { front: 'file:///docs/2026-09-09-front.jpg' } },
  ];
  await show();
  const ghost = screen.getByTestId('capture-ghost');
  expect(ghost.props.source).toEqual({ uri: 'file:///docs/2026-09-09-front.jpg' });
  expect(ghost).toHaveStyle({ opacity: photoParams.ghostOpacity });
  expect(screen.getByText(t('capture.ghost'))).toBeOnTheScreen();
  await press(t('capture.shutter'));
  // The side's last photo is the August one (September has no side).
  expect(screen.getByTestId('capture-ghost').props.source).toEqual({ uri: 'file:///docs/2026-08-10-side.jpg' });
});

test('the level follows the phone, and says when it is straight', async () => {
  await show();
  await act(async () => mockGravity?.({ x: 0, y: -1, z: 0 }));
  expect(screen.getByText(t('capture.level', { degrees: 0 }))).toBeOnTheScreen();
  expect(screen.getByText(t('capture.levelOk'))).toBeOnTheScreen();
  await act(async () => mockGravity?.({ x: Math.sin((5 * Math.PI) / 180), y: -Math.cos((5 * Math.PI) / 180), z: 0 }));
  expect(screen.getByText(t('capture.level', { degrees: 5 }))).toBeOnTheScreen();
  expect(screen.getByText(t('capture.levelOff'))).toBeOnTheScreen();
});

test('front, then side, each kept in the phone library under today; then back', async () => {
  await show();
  await press(t('capture.shutter'));
  expect(mockTake).toHaveBeenCalledWith({ quality: photoParams.jpegQuality, exif: false, shutterSound: false });
  expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'front');
  expect(screen.getByText(t('capture.pose.side', { step: 2, total: 2 }))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
  await press(t('capture.shutter'));
  expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'side');
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('the self-timer: the photo is taken after photo_timer_seconds, not before', async () => {
  await show();
  await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
  await press(t('capture.shutter'));
  expect(mockTake).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(photoParams.timerSeconds * 1000 - 1);
  });
  expect(mockTake).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(mockTake).toHaveBeenCalledTimes(1);
});

test('no camera to use (the simulator, or turned off): a photo from the library, kept the same way', async () => {
  mockPermission = { granted: false, canAskAgain: false };
  await show();
  expect(screen.getByText(t('capture.denied'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('capture.shutter') })).toBeNull();
  await press(t('capture.library'));
  expect(mockPick).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false });
  expect(mockServices.photos.add).toHaveBeenCalledWith('file:///cache/ImagePicker/picked.jpg', '2026-10-07', 'front');
});

test('a library pick cancelled keeps nothing', async () => {
  mockPick.mockResolvedValueOnce({ canceled: true, assets: [] } as never);
  await show();
  await press(t('capture.library'));
  expect(mockServices.photos.add).not.toHaveBeenCalled();
});

test('the camera asked for only when the user taps, never on arrival', async () => {
  mockPermission = { granted: false, canAskAgain: true };
  await show();
  expect(mockRequest).not.toHaveBeenCalled();
  await press(t('capture.allow'));
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: t('capture.shutter') })).toBeOnTheScreen();
});

test('a photo that cannot be kept: said so, reported by name, the step stays', async () => {
  mockServices.photos.add.mockRejectedValueOnce(Object.assign(new Error('disk full'), { name: 'FileSystemError' }));
  await show();
  await press(t('capture.shutter'));
  expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
  expect(screen.getByText(t('capture.pose.front', { step: 1, total: 2 }))).toBeOnTheScreen();
});

test('leaving stops the accelerometer', async () => {
  await show();
  await act(async () => {});
  await screen.unmount();
  expect(mockRemove).toHaveBeenCalledTimes(1);
});

/** A promise the test settles when it chooses. */
function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (settle = resolve));
  return { promise, settle };
}
const named = (name: string) => Object.assign(new Error('x'), { name });

describe('one tap, one photo', () => {
  test('a second tap while the camera is still taking takes nothing more', async () => {
    const shot = deferred<{ uri: string; width: number; height: number }>();
    mockTake.mockImplementationOnce(() => shot.promise);
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('capture.shutter') }));
    await fireEvent.press(screen.getByRole('button', { name: t('capture.shutter') }));
    await act(async () => shot.settle({ uri: 'file:///cache/Camera/shot.jpg', width: 1, height: 1 }));
    expect(mockTake).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
  });

  test('while a photo is being kept, the shutter and the library wait', async () => {
    const kept = deferred<never>();
    mockServices.photos.add.mockImplementationOnce(() => kept.promise);
    await show();
    await press(t('capture.shutter'));
    expect(screen.getByRole('button', { name: t('capture.shutter') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('capture.library') })).toBeDisabled();
  });

  test('during the countdown: said so, the shutter and the library wait, one photo at the end', async () => {
    await show();
    await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
    await press(t('capture.shutter'));
    expect(screen.getByText(t('capture.counting'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('capture.shutter') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('capture.library') })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: t('capture.shutter') }));
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('capture.counting'))).toBeNull();
  });

  test('the timer turned off again: the photo is taken at once', async () => {
    await show();
    await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
    await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
    await press(t('capture.shutter'));
    expect(mockTake).toHaveBeenCalledTimes(1);
  });

  test('closing during the countdown: no photo is taken afterwards', async () => {
    await show();
    await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
    await press(t('capture.shutter'));
    const before = jest.getTimerCount();
    await screen.unmount();
    expect(jest.getTimerCount()).toBe(before - 1); // the countdown cleared, not left to fire
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).not.toHaveBeenCalled();
  });
});

describe('two taps in the same instant (before the screen redraws)', () => {
  test('the shutter: one photo', async () => {
    await show();
    const shutter = screen.getByRole('button', { name: t('capture.shutter') });
    await act(async () => {
      await Promise.all([fireEvent.press(shutter), fireEvent.press(shutter)]);
    });
    expect(mockTake).toHaveBeenCalledTimes(1);
  });

  test('with the timer: one countdown, one photo', async () => {
    await show();
    await press(t('capture.timer', { seconds: photoParams.timerSeconds }));
    const shutter = screen.getByRole('button', { name: t('capture.shutter') });
    await act(async () => {
      await Promise.all([fireEvent.press(shutter), fireEvent.press(shutter)]);
    });
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).toHaveBeenCalledTimes(1);
  });
});

describe('failures', () => {
  test('the camera fails: said so, reported by name, the step stays', async () => {
    mockTake.mockRejectedValueOnce(named('CameraError'));
    await show();
    await press(t('capture.shutter'));
    expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'CameraError' });
    expect(screen.getByText(t('capture.pose.front', { step: 1, total: 2 }))).toBeOnTheScreen();
  });

  test('the library fails: said so, reported by name', async () => {
    mockPick.mockRejectedValueOnce(named('PickerError'));
    await show();
    await press(t('capture.library'));
    expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'PickerError' });
  });

  test('a retry that works clears the failure and moves on', async () => {
    mockServices.photos.add.mockRejectedValueOnce(named('FileSystemError'));
    await show();
    await press(t('capture.shutter'));
    await press(t('capture.shutter'));
    expect(screen.queryByText(t('capture.failed'))).toBeNull();
    expect(screen.getByText(t('capture.pose.side', { step: 2, total: 2 }))).toBeOnTheScreen();
  });
});

describe('the level', () => {
  test('read photo_level_update_ms apart', async () => {
    await show();
    expect(mockInterval).toHaveBeenCalledWith(photoParams.levelUpdateMs);
  });

  test('no accelerometer: no level, nothing listened to', async () => {
    mockAvailable = async () => false;
    await show();
    expect(mockGravity).toBeNull();
    expect(screen.queryByText(t('capture.levelOk'))).toBeNull();
  });

  test('closed before the phone answers: nothing listened to afterwards', async () => {
    const answer = deferred<boolean>();
    mockAvailable = () => answer.promise;
    await show();
    await screen.unmount();
    await act(async () => answer.settle(true));
    expect(mockGravity).toBeNull();
  });
});

describe('the camera permission', () => {
  test('not known yet: no camera, no shutter, no "off"', async () => {
    mockPermission = null;
    await show();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByRole('button', { name: t('capture.shutter') })).toBeNull();
    expect(screen.queryByText(t('capture.denied'))).toBeNull();
  });

  test('asked and refused: said so, the library still there, no camera running', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    mockAnswer = { granted: false, canAskAgain: false };
    await show();
    await press(t('capture.allow'));
    expect(screen.getByText(t('capture.denied'))).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.getByRole('button', { name: t('capture.library') })).toBeOnTheScreen();
  });
});

test('the viewfinder stays dark in the light theme; the level under it is in the page colours, the accent when straight', async () => {
  await show();
  expect(screen.getByTestId('capture-finder')).toHaveStyle({ backgroundColor: palettes.dark.background });
  await act(async () => mockGravity?.({ x: 0, y: -1, z: 0 }));
  // On the page, not in the dark box: the light theme's own colours, readable on its background.
  expect(screen.getByText(t('capture.level', { degrees: 0 }))).toHaveStyle({ color: palettes.light.accent });
  expect(screen.getByText(t('capture.levelOk'))).toHaveStyle({ color: palettes.light.textSecondary });
});

test('closed while the camera is still taking: the late photo is not kept, and nothing goes back twice', async () => {
  const shot = deferred<{ uri: string; width: number; height: number }>();
  mockTake.mockImplementationOnce(() => shot.promise);
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('capture.shutter') }));
  await press(t('capture.close'));
  await screen.unmount();
  await act(async () => shot.settle({ uri: 'file:///cache/Camera/shot.jpg', width: 1, height: 1 }));
  expect(mockServices.photos.add).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('closed on the side while the photo is being kept: no second going back', async () => {
  await show();
  await press(t('capture.shutter')); // front kept
  const kept = deferred<never>();
  mockServices.photos.add.mockImplementationOnce(() => kept.promise);
  await fireEvent.press(screen.getByRole('button', { name: t('capture.shutter') }));
  await press(t('capture.close'));
  await screen.unmount();
  await act(async () => kept.settle(undefined as never));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('Close goes back without a photo', async () => {
  await show();
  await press(t('capture.close'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockServices.photos.add).not.toHaveBeenCalled();
});
