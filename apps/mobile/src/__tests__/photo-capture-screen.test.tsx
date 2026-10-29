/**
 * CaptureFlowTests (K-601, K-1055, H1 §2.4, prototype yeniden-yapim §10): the guided progress photo from the first set's intro
 * to its result. Two photos, front then side, each over the last photo of its pose (faded), in a body outline, with a calm level
 * that never shows degrees and never blocks the shutter; a self-timer for a phone on a stand; a preview after every picture
 * where only Use photo keeps it; a library path where there is no camera (the simulator, or it is off). Every photo goes to the
 * phone's photos folder (K-614) and nowhere else: neither the API client nor fetch is ever called.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Linking, processColor } from 'react-native';

import PhotoCaptureScreen from '@/app/photo-capture';
import { t } from '@/copy';
import type { PhotoCheck } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

type Permission = { granted: boolean; canAskAgain: boolean };
let mockPermission: Permission | null = { granted: true, canAskAgain: true };
let mockAnswer: Permission = { granted: true, canAskAgain: true };
const mockRequest = jest.fn();
const mockTake = jest.fn(async (_options: unknown) => ({ uri: 'file:///cache/Camera/shot.jpg', width: 3024, height: 4032 }));
const mockCamera = jest.fn();
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
    CameraView: React.forwardRef(function CameraView(props: object, ref: React.Ref<unknown>) {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      mockCamera(props);
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTake }));
      return <View testID="camera" />;
    }),
  };
});

const mockPick = jest.fn(async (_options: unknown) => ({ canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/picked.jpg' }] }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (options: unknown) => mockPick(options) }));

type Gravity = { x: number; y: number; z: number };
let mockGravity: ((g: Gravity) => void) | null = null;
const mockRemove = jest.fn();
const mockInterval = jest.fn();
let mockAvailable: () => Promise<boolean> = async () => true;
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: () => mockAvailable(),
    setUpdateInterval: (ms: number) => mockInterval(ms),
    addListener: (listener: (g: Gravity) => void) => {
      mockGravity = listener;
      return { remove: mockRemove };
    },
  },
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), replace: (href: string) => mockReplace(href) } }));

let mockChecks: PhotoCheck[] = [];
let mockRead: () => Promise<PhotoCheck[]> = async () => mockChecks;
const mockServices = {
  photos: {
    checks: jest.fn(() => mockRead()),
    add: jest.fn(async (from: string, takenOn: string, pose: string) => ({ takenOn, pose, uri: `file:///docs/${takenOn}-${pose}.jpg`, from })),
  },
  report: jest.fn(),
  // Present so a call would be seen: a progress photo never goes through it.
  api: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), PATCH: jest.fn(), DELETE: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const fetchSpy = jest.fn();
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 7, 8, 0), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
});
afterAll(() => jest.useRealTimers());

/** A set from an earlier day: the intro is for the first set only, and the second set has photos to line up with. */
const EARLIER: PhotoCheck[] = [
  { takenOn: '2026-09-09', photos: { front: 'file:///docs/2026-09-09-front.jpg', side: 'file:///docs/2026-09-09-side.jpg' } },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission = { granted: true, canAskAgain: true };
  mockAnswer = { granted: true, canAskAgain: true };
  mockChecks = EARLIER;
  mockRead = async () => mockChecks;
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
const button = (name: string) => screen.getByRole('button', { name });
const maybeButton = (name: string) => screen.queryByRole('button', { name });
const press = async (name: string) => {
  await fireEvent.press(button(name));
  await act(async () => {});
};
const shutter = t('capture.shutter');
const use = t('capture.preview.use');
const retake = t('capture.preview.retake');
const timerLabel = (seconds: number) => (seconds === 0 ? t('capture.timer.labelOff') : t('capture.timer.label', { seconds }));
const pose = (name: 'front' | 'side') => t(`capture.pose.${name}`, { step: name === 'front' ? 1 : 2, total: 2 });

/** The first set: no photo on the phone yet, so the intro comes first; Start with the stand (the default) or in hands. */
async function startFirstSet(how: 'stand' | 'hand' = 'stand') {
  mockChecks = [];
  await show();
  if (how === 'hand') await press(t('capture.intro.hand'));
  await press(t('capture.intro.start'));
}
/** One pose taken and used, with the timer off so the shutter takes it at once. */
async function useFront() {
  await press(timerLabel(0));
  await press(shutter);
  await press(use);
}

/** Gravity on an upright phone leaning `degrees` in its plane. */
const lean = (degrees: number): Gravity => ({ x: Math.sin((degrees * Math.PI) / 180), y: -Math.cos((degrees * Math.PI) / 180), z: 0 });
/** The sensor reporting the same lean for a while: the smoothed level settles on it. */
async function hold(degrees: number, readings = 40) {
  await act(async () => {
    for (let i = 0; i < readings; i += 1) mockGravity?.(lean(degrees));
  });
}
const lastFacing = () => mockCamera.mock.calls.at(-1)?.[0].facing;

/**
 * Two presses before the screen redraws (a double tap, faster than React commits): the control's own handler is called twice
 * in one go, so the second runs on the same render as the first.
 */
async function twice(element: ReturnType<typeof button>) {
  let handler: (() => void) | undefined;
  for (let node: typeof element | null = element; node !== null && handler === undefined; node = node.parent) handler = node.props.onPress ?? node.props.onClick;
  if (handler === undefined) throw new Error('nothing to press');
  const press = handler as (event: object) => void;
  const event = { nativeEvent: {}, stopPropagation() {}, preventDefault() {} };
  await act(async () => {
    press(event);
    press(event);
  });
}

/** A promise the test settles when it chooses. */
function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (settle = resolve));
  return { promise, settle };
}
const named = (name: string) => Object.assign(new Error('x'), { name });
type Picture = { uri: string; width: number; height: number };
const shotAt = (uri: string): Picture => ({ uri, width: 1, height: 1 });

describe('the intro (first set only)', () => {
  test('no photo on the phone yet: the tips, the choice, the note, Start — and no camera yet', async () => {
    mockChecks = [];
    await show();
    expect(screen.getByText(t('capture.intro.title'))).toBeOnTheScreen();
    for (const tip of ['light', 'clothes', 'phone']) expect(screen.getByText(t(`capture.intro.${tip}`))).toBeOnTheScreen();
    expect(button(t('capture.intro.stand', { seconds: photoParams.timerSeconds }))).toBeOnTheScreen();
    expect(button(t('capture.intro.hand'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.intro.note'))).toBeOnTheScreen();
    expect(button(t('capture.intro.start'))).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(mockGravity).toBeNull(); // the level is read from the camera on, not before
    expect(mockRequest).not.toHaveBeenCalled(); // and the camera is not asked for on arrival
  });

  test('a set already on the phone: no intro, the camera at once', async () => {
    await show();
    expect(screen.queryByText(t('capture.intro.title'))).toBeNull();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
  });

  test('waits for the photos to be read: neither the intro nor the camera before the answer', async () => {
    const read = deferred<PhotoCheck[]>();
    mockRead = () => read.promise;
    await show();
    expect(screen.queryByText(t('capture.intro.title'))).toBeNull();
    expect(screen.queryByTestId('camera')).toBeNull();
    await act(async () => read.settle(EARLIER));
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
  });

  test('the photos cannot be read: reported by name, and the first set starts as a first set', async () => {
    mockRead = async () => {
      throw named('FileSystemError');
    };
    await show();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
    expect(screen.getByText(t('capture.intro.title'))).toBeOnTheScreen();
  });

  test('on a stand is chosen at first: Start opens the front camera with the stand timer', async () => {
    await startFirstSet();
    expect(lastFacing()).toBe('front');
    expect(button(timerLabel(photoParams.timerSeconds))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    expect(button(timerLabel(0))).toHaveProp('accessibilityState', expect.objectContaining({ selected: false }));
  });

  test('someone holds it: Start opens the back camera with the timer off', async () => {
    await startFirstSet('hand');
    expect(lastFacing()).toBe('back');
    expect(button(timerLabel(photoParams.timerHandSeconds))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    expect(photoParams.timerHandSeconds).toBe(0);
  });

  test('the choice can be changed back before Start', async () => {
    mockChecks = [];
    await show();
    await press(t('capture.intro.hand'));
    await press(t('capture.intro.stand', { seconds: photoParams.timerSeconds }));
    await press(t('capture.intro.start'));
    expect(lastFacing()).toBe('front');
  });

  test('the choice is shown as chosen', async () => {
    mockChecks = [];
    await show();
    expect(button(t('capture.intro.stand', { seconds: photoParams.timerSeconds }))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    await press(t('capture.intro.hand'));
    expect(button(t('capture.intro.hand'))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  });

  test('without the intro (a later set) the camera starts as for a stand: front, the stand timer', async () => {
    await show();
    expect(lastFacing()).toBe('front');
    expect(button(timerLabel(photoParams.timerSeconds))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  });

  test('Close on the intro goes back and keeps nothing', async () => {
    mockChecks = [];
    await show();
    await press(t('capture.close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).not.toHaveBeenCalled();
  });

  test('the intro is the light page; once the first photo is used the intro does not come back', async () => {
    await startFirstSet();
    await useFront();
    expect(screen.queryByText(t('capture.intro.title'))).toBeNull();
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
  });

  test('the intro is in the theme the person chose, not the camera dark', async () => {
    mockChecks = [];
    await show();
    expect(screen.getByText(t('capture.intro.title'))).toHaveStyle({ color: palettes.light.text });
  });
});

describe('the camera permission', () => {
  test('granted: the camera and the shutter', async () => {
    await show();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
    expect(button(shutter)).toBeOnTheScreen();
  });

  test('not known yet: no camera, no shutter, no "off"', async () => {
    mockPermission = null;
    await show();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(maybeButton(shutter)).toBeNull();
    expect(screen.queryByText(t('capture.off.title'))).toBeNull();
    expect(screen.queryByText(t('capture.ask.title'))).toBeNull();
  });

  test('not asked yet: said what the camera is for, asked for only when the user taps Continue, never on arrival', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await show();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.getByText(t('capture.ask.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.ask.body'))).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(maybeButton(t('capture.off.settings'))).toBeNull();
    await press(t('capture.allow'));
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
    expect(button(shutter)).toBeOnTheScreen();
  });

  test('not asked yet, after the intro: Start leads to Continue, and the answer opens the camera', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await startFirstSet();
    expect(mockRequest).not.toHaveBeenCalled();
    await press(t('capture.allow'));
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
  });

  test('not asked yet: a photo from the library is there too', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await show();
    await press(t('capture.library'));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
  });

  test('asked and refused: the camera is off, Settings and the library are the ways on, no camera running', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    mockAnswer = { granted: false, canAskAgain: false };
    await show();
    await press(t('capture.allow'));
    expect(screen.getByText(t('capture.off.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.off.body'))).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(button(t('capture.off.settings'))).toBeOnTheScreen();
    expect(button(t('capture.library'))).toBeOnTheScreen();
    expect(maybeButton(t('capture.allow'))).toBeNull(); // asking again does nothing on iOS
  });

  test('refused for good: Open Settings opens the app settings', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    await show();
    expect(screen.getByText(t('capture.off.title'))).toBeOnTheScreen();
    await press(t('capture.off.settings'));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('refused for good: the library still works, through the preview, for both poses', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    await show();
    await press(t('capture.library'));
    expect(mockPick).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false });
    expect(mockServices.photos.add).not.toHaveBeenCalled(); // not before Use photo
    await press(use);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/ImagePicker/picked.jpg', '2026-10-07', 'front');
    // The side pose is asked for in the same way: the screen is still the camera-off one.
    expect(screen.getByText(t('capture.off.title'))).toBeOnTheScreen();
    await press(t('capture.library'));
    await press(use);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/ImagePicker/picked.jpg', '2026-10-07', 'side');
    expect(screen.getByText(t('capture.done.title', { week: 5 }))).toBeOnTheScreen();
  });

  test('refused for good: Close goes back', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    await show();
    await press(t('capture.close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('refused for good, on the first set: the intro first, then the camera-off screen', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    await startFirstSet();
    expect(screen.getByText(t('capture.off.title'))).toBeOnTheScreen();
  });
});

describe('the camera screen', () => {
  test('front first: the pose, the outline, the hint, the controls', async () => {
    mockChecks = [];
    await startFirstSet();
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
    expect(screen.getByTestId('capture-silhouette')).toBeOnTheScreen();
    expect(screen.getByText(t('capture.hint.front'))).toBeOnTheScreen();
    expect(screen.queryByTestId('capture-ghost')).toBeNull(); // no photo yet: nothing to line up with
    for (const name of [t('capture.close'), t('capture.switch'), t('capture.library'), shutter]) expect(button(name)).toBeOnTheScreen();
  });

  test('the camera is the whole screen and stays dark in the light theme', async () => {
    await show();
    expect(screen.getByTestId('capture-camera')).toHaveStyle({ backgroundColor: palettes.dark.background });
    expect(screen.getByText(pose('front'))).toHaveStyle({ color: palettes.dark.text });
  });

  test('the shutter is the thumb-sized ring, the timer choices and the round buttons at least size.touch', async () => {
    await show();
    expect(button(shutter)).toHaveStyle({ width: tokens.size.shutter, height: tokens.size.shutter });
    expect(tokens.size.shutter).toBeGreaterThanOrEqual(tokens.size.touch);
    for (const seconds of photoParams.timerOptions) expect(button(timerLabel(seconds))).toHaveStyle({ minHeight: tokens.size.touch });
    for (const name of [t('capture.close'), t('capture.switch'), t('capture.library')]) {
      expect(button(name)).toHaveStyle({ width: tokens.size.touch, height: tokens.size.touch });
    }
  });

  test('the photo is taken with the options that keep it private and quiet', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(mockTake).toHaveBeenCalledWith({ quality: photoParams.jpegQuality, exif: false, shutterSound: false });
  });

  test('the saved photo is not mirrored, whichever camera', async () => {
    await show();
    expect(mockCamera.mock.calls.at(-1)?.[0].mirror).toBe(false);
    await press(t('capture.switch'));
    expect(mockCamera.mock.calls.at(-1)?.[0].mirror).toBe(false);
  });

  test('the outline, the faded photo and the pill are not read out one by one: decorative for VoiceOver', async () => {
    await show();
    expect(screen.getByTestId('capture-silhouette')).toHaveProp('accessible', false);
    expect(screen.getByTestId('capture-ghost')).toHaveProp('accessible', false);
  });

  test('the side pose has its own outline, and its own hint', async () => {
    mockChecks = [];
    await startFirstSet();
    await useFront();
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.hint.side'))).toBeOnTheScreen();
    expect(screen.getByTestId('capture-silhouette')).toBeOnTheScreen();
  });

  describe('switching the camera', () => {
    test('the switch button turns front to back and back again', async () => {
      await show();
      expect(lastFacing()).toBe('front');
      await press(t('capture.switch'));
      expect(lastFacing()).toBe('back');
      await press(t('capture.switch'));
      expect(lastFacing()).toBe('front');
    });

    test('the camera chosen stays for the side pose', async () => {
      await show();
      await press(t('capture.switch'));
      await useFront();
      expect(lastFacing()).toBe('back');
    });

    test('the camera chosen stays after a retake', async () => {
      await show();
      await press(t('capture.switch'));
      await press(timerLabel(0));
      await press(shutter);
      await press(retake);
      expect(lastFacing()).toBe('back');
    });

    test('with the front camera the faded photo is turned over to match the mirrored picture; with the back it is not', async () => {
      await show();
      expect(screen.getByTestId('capture-ghost')).toHaveStyle({ transform: [{ scaleX: -1 }] });
      await press(t('capture.switch'));
      expect(screen.getByTestId('capture-ghost').props.style).not.toEqual(expect.arrayContaining([expect.objectContaining({ transform: expect.anything() })]));
    });

    test('the side outline faces the way the person turns: right on the mirrored front camera, flipped on the back one', async () => {
      await show();
      await useFront();
      expect(screen.getByTestId('capture-silhouette-stroke').props.matrix).toBeUndefined();
      await press(t('capture.switch'));
      expect(screen.getByTestId('capture-silhouette-stroke').props.matrix).toEqual([-1, 0, 0, 1, 230, 0]); // mirrored across the drawing's width
    });

    test('the front outline is the same either way', async () => {
      await show();
      await press(t('capture.switch'));
      expect(screen.getByTestId('capture-silhouette-stroke').props.matrix).toBeUndefined();
    });
  });

  describe('the last photo of the pose, faded behind the outline', () => {
    test('shown at photo_ghost_opacity, with the hint that names it', async () => {
      mockChecks = [
        { takenOn: '2026-08-10', photos: { front: 'file:///docs/2026-08-10-front.jpg', side: 'file:///docs/2026-08-10-side.jpg' } },
        { takenOn: '2026-09-09', photos: { front: 'file:///docs/2026-09-09-front.jpg' } },
      ];
      await show();
      const ghost = screen.getByTestId('capture-ghost');
      expect(ghost.props.source).toEqual({ uri: 'file:///docs/2026-09-09-front.jpg' });
      expect(ghost).toHaveStyle({ opacity: photoParams.ghostOpacity });
      expect(screen.getByText(t('capture.hint.frontGhost'))).toBeOnTheScreen();
      await useFront();
      // The side's last photo is the August one (September has no side).
      expect(screen.getByTestId('capture-ghost').props.source).toEqual({ uri: 'file:///docs/2026-08-10-side.jpg' });
      expect(screen.getByText(t('capture.hint.sideGhost'))).toBeOnTheScreen();
    });

    test('no photo of that pose yet: nothing faded, the shorter hint', async () => {
      mockChecks = [{ takenOn: '2026-09-09', photos: { front: 'file:///docs/2026-09-09-front.jpg' } }];
      await show();
      await useFront();
      expect(screen.queryByTestId('capture-ghost')).toBeNull();
      expect(screen.getByText(t('capture.hint.side'))).toBeOnTheScreen();
    });
  });

  describe('the level', () => {
    test('read photo_level_update_ms apart', async () => {
      await show();
      expect(mockInterval).toHaveBeenCalledWith(photoParams.levelUpdateMs);
    });

    test('no reading yet: no word, an idle outline, the plain hint', async () => {
      await show();
      expect(screen.queryByText(t('capture.level.straight'))).toBeNull();
      expect(screen.queryByText(t('capture.level.upright'))).toBeNull();
      expect(screen.getByTestId('capture-silhouette-stroke')).toHaveProp('strokeDasharray', expect.anything());
    });

    test('a straight phone: the word "Straight", the outline solid and in the accent', async () => {
      await show();
      await hold(0);
      expect(screen.getByText(t('capture.level.straight'))).toBeOnTheScreen();
      expect(screen.queryByText(t('capture.level.upright'))).toBeNull();
      const stroke = screen.getByTestId('capture-silhouette-stroke');
      expect(stroke).toHaveProp('stroke', { payload: processColor(palettes.dark.accent), type: 0 });
      expect(stroke.props.strokeDasharray).toBeUndefined();
      expect(screen.getByText(t('capture.hint.frontGhost'))).toBeOnTheScreen();
    });

    test('a leaning phone: "Hold the phone upright", the outline grey and dashed, the hint says it can still be taken', async () => {
      await show();
      await hold(20);
      expect(screen.getByText(t('capture.level.upright'))).toBeOnTheScreen();
      expect(screen.queryByText(t('capture.level.straight'))).toBeNull();
      const stroke = screen.getByTestId('capture-silhouette-stroke');
      expect(stroke).toHaveProp('stroke', { payload: processColor(palettes.dark.text), type: 0 });
      expect(stroke).toHaveProp('strokeDasharray', expect.anything());
      expect(screen.getByText(t('capture.hint.tilted'))).toBeOnTheScreen();
    });

    test('never degrees: no number with a degree sign, straight or leaning', async () => {
      await show();
      for (const degrees of [0, 3, 12.3, 45]) {
        await hold(degrees);
        expect(screen.queryByText(/°|degree/i)).toBeNull();
        expect(screen.queryByText(/\d+(\.\d)?\s*°/)).toBeNull();
      }
    });

    test('a tilted phone can still take the photo: the shutter is not blocked', async () => {
      await show();
      await hold(25);
      expect(screen.getByText(t('capture.level.upright'))).toBeOnTheScreen();
      expect(button(shutter)).not.toBeDisabled();
      await press(timerLabel(0));
      await press(shutter);
      expect(mockTake).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
    });

    test('the library is not blocked by a tilt either', async () => {
      await show();
      await hold(25);
      expect(button(t('capture.library'))).not.toBeDisabled();
    });

    test('hysteresis: once straight, a lean between the two thresholds keeps it straight', async () => {
      await show();
      await hold(0);
      const between = (photoParams.levelToleranceDeg + photoParams.levelExitDeg) / 2;
      await hold(between);
      expect(screen.getByText(t('capture.level.straight'))).toBeOnTheScreen();
    });

    test('hysteresis: once leaning, the same lean between the thresholds stays "upright"', async () => {
      await show();
      await hold(20);
      const between = (photoParams.levelToleranceDeg + photoParams.levelExitDeg) / 2;
      await hold(between);
      expect(screen.getByText(t('capture.level.upright'))).toBeOnTheScreen();
    });

    test('a phone that leans for good, then comes back, is called upright and then straight again', async () => {
      await show();
      await hold(0);
      await hold(photoParams.levelExitDeg + 6);
      expect(screen.getByText(t('capture.level.upright'))).toBeOnTheScreen();
      await hold(0);
      expect(screen.getByText(t('capture.level.straight'))).toBeOnTheScreen();
    });

    test('one jolt of a reading does not change the word', async () => {
      await show();
      await hold(0);
      await act(async () => mockGravity?.(lean(20)));
      expect(screen.getByText(t('capture.level.straight'))).toBeOnTheScreen();
    });

    test('said to VoiceOver when the word changes, not on every reading', async () => {
      await show();
      await hold(0, 10);
      expect(announce).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenLastCalledWith(t('capture.level.straight'));
      await hold(0, 10);
      expect(announce).toHaveBeenCalledTimes(1);
      await hold(20);
      expect(announce).toHaveBeenCalledTimes(2);
      expect(announce).toHaveBeenLastCalledWith(t('capture.level.upright'));
      await hold(20, 10);
      expect(announce).toHaveBeenCalledTimes(2);
    });

    test('the word is a polite live region', async () => {
      await show();
      await hold(0);
      expect(screen.getByText(t('capture.level.straight'))).toHaveProp('accessibilityLiveRegion', 'polite');
    });

    test('no accelerometer: no word, nothing listened to, the shutter works', async () => {
      mockAvailable = async () => false;
      await show();
      expect(mockGravity).toBeNull();
      expect(screen.queryByText(t('capture.level.straight'))).toBeNull();
      expect(screen.queryByText(t('capture.level.upright'))).toBeNull();
      expect(button(shutter)).not.toBeDisabled();
    });

    test('closed before the phone answers: nothing listened to afterwards', async () => {
      const answer = deferred<boolean>();
      mockAvailable = () => answer.promise;
      await show();
      await screen.unmount();
      await act(async () => answer.settle(true));
      expect(mockGravity).toBeNull();
    });

    test('leaving stops the accelerometer', async () => {
      await show();
      await screen.unmount();
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    test('only the camera listens: it stops for the preview and starts again on Retake', async () => {
      await show();
      await press(timerLabel(0));
      await press(shutter);
      expect(mockRemove).toHaveBeenCalledTimes(1);
      await press(retake);
      expect(mockGravity).not.toBeNull();
      await hold(0);
      expect(screen.getByText(t('capture.level.straight'))).toBeOnTheScreen();
    });
  });
});

describe('the timer', () => {
  test('the choices come from photo_timer_options, the stand timer is among them, and the stand timer is the one chosen', async () => {
    await show();
    expect(photoParams.timerOptions).toEqual([0, 3, 10]);
    expect(photoParams.timerOptions).toContain(photoParams.timerSeconds);
    expect(photoParams.timerOptions).toContain(photoParams.timerHandSeconds);
    for (const seconds of photoParams.timerOptions) {
      expect(button(timerLabel(seconds))).toHaveProp('accessibilityState', expect.objectContaining({ selected: seconds === photoParams.timerSeconds }));
    }
    expect(screen.getByText(t('capture.timer.off'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.timer.seconds', { seconds: 3 }))).toBeOnTheScreen();
  });

  test('a choice is shown as chosen, and only one at a time', async () => {
    await show();
    await press(timerLabel(3));
    for (const seconds of photoParams.timerOptions) {
      expect(button(timerLabel(seconds))).toHaveProp('accessibilityState', expect.objectContaining({ selected: seconds === 3 }));
    }
  });

  test('the choice lasts through a retake and into the next pose', async () => {
    await show();
    await press(timerLabel(3));
    await press(shutter);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await press(retake);
    expect(button(timerLabel(3))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    await press(shutter);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await press(use);
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
    expect(button(timerLabel(3))).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  });

  test('off: the photo is taken at once, no countdown', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(mockTake).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('capture-count')).toBeNull();
  });

  test.each([3, 10])('%i s: counts down a second at a time, shown, and takes the photo at the end — not before', async (seconds) => {
    await show();
    await press(timerLabel(seconds));
    await press(shutter);
    expect(mockTake).not.toHaveBeenCalled();
    for (let left = seconds; left >= 1; left -= 1) {
      expect(screen.getByTestId('capture-count')).toHaveTextContent(String(left));
      expect(mockTake).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(999);
      });
      expect(screen.getByTestId('capture-count')).toHaveTextContent(String(left)); // not a moment early
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
    }
    expect(mockTake).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('capture-count')).toBeNull();
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
  });

  test('the number is big, in the display face and the accent, and said to VoiceOver', async () => {
    await show();
    await press(shutter);
    const count = screen.getByTestId('capture-count');
    expect(count).toHaveStyle({ fontFamily: tokens.font.display, fontSize: tokens.type.countdown, color: palettes.dark.accent });
    expect(count).toHaveProp('accessibilityLabel', t('capture.counting', { seconds: photoParams.timerSeconds }));
    expect(count).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  test('during the countdown only Cancel is offered: no shutter, library, switch, timer or close', async () => {
    await show();
    await press(shutter);
    expect(button(t('capture.cancel'))).toBeOnTheScreen();
    for (const name of [shutter, t('capture.library'), t('capture.switch'), t('capture.close'), timerLabel(3)]) expect(maybeButton(name)).toBeNull();
    expect(screen.getByTestId('capture-silhouette')).toBeOnTheScreen(); // the outline stays to stand in
  });

  test('Cancel stops the timer and takes nothing; the controls are back', async () => {
    await show();
    await press(shutter);
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    await press(t('capture.cancel'));
    expect(screen.queryByTestId('capture-count')).toBeNull();
    expect(button(shutter)).toBeOnTheScreen();
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).not.toHaveBeenCalled();
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('capture-camera')).toBeOnTheScreen();
  });

  test('after Cancel the shutter starts a fresh countdown from the top', async () => {
    await show();
    await press(shutter);
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    await press(t('capture.cancel'));
    await press(shutter);
    expect(screen.getByTestId('capture-count')).toHaveTextContent(String(photoParams.timerSeconds));
  });

  test('closing during the countdown: the countdown is cleared and no photo is taken afterwards', async () => {
    await show();
    await press(shutter);
    await screen.unmount();
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).not.toHaveBeenCalled();
  });

  test('two taps in the same instant: one countdown, one photo', async () => {
    await show();
    const tap = button(shutter);
    await twice(tap);
    await act(async () => {
      jest.advanceTimersByTime(photoParams.timerSeconds * 1000);
    });
    expect(mockTake).toHaveBeenCalledTimes(1);
  });

  test('two taps in the same instant with the timer off: one photo', async () => {
    await show();
    await press(timerLabel(0));
    const tap = button(shutter);
    await twice(tap);
    expect(mockTake).toHaveBeenCalledTimes(1);
  });
});

describe('one thing at a time', () => {
  test('a second tap while the camera is still taking takes nothing more', async () => {
    const shot = deferred<Picture>();
    mockTake.mockImplementationOnce(() => shot.promise);
    await show();
    await press(timerLabel(0));
    await fireEvent.press(button(shutter));
    await fireEvent.press(button(shutter));
    await act(async () => shot.settle(shotAt('file:///cache/Camera/shot.jpg')));
    expect(mockTake).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
  });

  test('while the camera takes, the shutter and the library wait', async () => {
    const shot = deferred<Picture>();
    mockTake.mockImplementationOnce(() => shot.promise);
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(button(shutter)).toBeDisabled();
    expect(button(t('capture.library'))).toBeDisabled();
    await act(async () => shot.settle(shotAt('file:///cache/Camera/shot.jpg')));
  });

  test('while the library picks, the shutter and the library wait', async () => {
    const pick = deferred<{ canceled: boolean; assets: { uri: string }[] }>();
    mockPick.mockImplementationOnce(() => pick.promise);
    await show();
    await press(t('capture.library'));
    expect(button(shutter)).toBeDisabled();
    expect(button(t('capture.library'))).toBeDisabled();
    await act(async () => pick.settle({ canceled: true, assets: [] }));
    expect(button(shutter)).not.toBeDisabled();
  });

  test('while a photo is being kept, both preview buttons wait and a second Use photo keeps nothing more', async () => {
    const kept = deferred<never>();
    mockServices.photos.add.mockImplementationOnce(() => kept.promise);
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await fireEvent.press(button(use));
    await fireEvent.press(button(use));
    expect(button(use)).toBeDisabled();
    expect(button(retake)).toBeDisabled();
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
    await act(async () => kept.settle({ takenOn: '2026-10-07', pose: 'front', uri: 'file:///docs/2026-10-07-front.jpg' } as never));
  });

  test('two Use photo taps in the same instant: one photo kept', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    const tap = button(use);
    await twice(tap);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
  });
});

describe('the preview', () => {
  test('after the shutter the photo is shown full screen, with Retake and Use photo — and nothing is kept yet', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
    expect(screen.getByLabelText(t('capture.preview.photo', { pose: t('capture.done.front') }))).toHaveProp('source', { uri: 'file:///cache/Camera/shot.jpg' });
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
    expect(button(retake)).toBeOnTheScreen();
    expect(button(use)).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(mockServices.photos.add).not.toHaveBeenCalled();
  });

  test('the preview is dark like the camera', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(screen.getByTestId('capture-preview')).toHaveStyle({ backgroundColor: palettes.dark.background });
  });

  test('Retake keeps nothing and goes back to the camera for the same pose', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(retake);
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
    expect(screen.queryByTestId('capture-preview')).toBeNull();
    await press(shutter);
    await press(use);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'front');
  });

  test('Retake on the side goes back to the side, with the front still kept', async () => {
    await show();
    await press(timerLabel(0));
    await useFront();
    await press(shutter);
    await press(retake);
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
  });

  test('a retake and a second photo: the second one is the one kept', async () => {
    mockTake.mockResolvedValueOnce(shotAt('file:///cache/Camera/first.jpg')).mockResolvedValueOnce(shotAt('file:///cache/Camera/second.jpg'));
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(retake);
    await press(shutter);
    await press(use);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add.mock.calls[0][0]).toBe('file:///cache/Camera/second.jpg');
  });

  test('Use photo keeps it under today, with the pose, and moves on to the side', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(use);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'front');
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('the day is the day the picture was taken, not the day it was kept', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    jest.setSystemTime(new Date(2026, 9, 8, 0, 30));
    await press(use);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'front');
    jest.setSystemTime(new Date(2026, 9, 7, 8, 0));
  });

  test('a photo that cannot be kept: the existing words, reported by name, still on the preview', async () => {
    mockServices.photos.add.mockRejectedValueOnce(Object.assign(new Error('disk full'), { name: 'FileSystemError' }));
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(use);
    expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
    expect(button(use)).not.toBeDisabled();
    expect(announce).toHaveBeenCalledWith(t('capture.failed'));
  });

  test('after a failure, Use photo tries again with the same photo and moves on', async () => {
    mockServices.photos.add.mockRejectedValueOnce(named('FileSystemError'));
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(use);
    await press(use);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(2);
    expect(mockServices.photos.add.mock.calls[1]).toEqual(mockServices.photos.add.mock.calls[0]);
    expect(screen.queryByText(t('capture.failed'))).toBeNull();
    expect(screen.getByText(pose('side'))).toBeOnTheScreen();
  });

  test('after a failure, Retake clears it and returns to the camera', async () => {
    mockServices.photos.add.mockRejectedValueOnce(named('FileSystemError'));
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(use);
    await press(retake);
    expect(screen.queryByText(t('capture.failed'))).toBeNull();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
  });
});

describe('the library', () => {
  test('goes through the preview, then Use photo keeps it', async () => {
    await show();
    await press(t('capture.library'));
    expect(mockPick).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false });
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
    expect(screen.getByLabelText(t('capture.preview.photo', { pose: t('capture.done.front') }))).toHaveProp('source', { uri: 'file:///cache/ImagePicker/picked.jpg' });
    await press(use);
    expect(mockServices.photos.add).toHaveBeenCalledWith('file:///cache/ImagePicker/picked.jpg', '2026-10-07', 'front');
  });

  test('works for the side too', async () => {
    await show();
    await useFront();
    await press(t('capture.library'));
    await press(use);
    expect(mockServices.photos.add).toHaveBeenLastCalledWith('file:///cache/ImagePicker/picked.jpg', '2026-10-07', 'side');
    expect(screen.getByText(t('capture.done.title', { week: 5 }))).toBeOnTheScreen();
  });

  test('Retake after a library pick goes back to the camera', async () => {
    await show();
    await press(t('capture.library'));
    await press(retake);
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
  });

  test('a pick cancelled keeps nothing and stays on the camera', async () => {
    mockPick.mockResolvedValueOnce({ canceled: true, assets: [] } as never);
    await show();
    await press(t('capture.library'));
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(screen.queryByTestId('capture-preview')).toBeNull();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
  });

  test('a library that fails: the existing words, reported by name', async () => {
    mockPick.mockRejectedValueOnce(named('PickerError'));
    await show();
    await press(t('capture.library'));
    expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'PickerError' });
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
  });
});

describe('the camera fails', () => {
  test('said so on the camera, reported by name, the pose stays, and a later try works', async () => {
    mockTake.mockRejectedValueOnce(named('CameraError'));
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(screen.getByText(t('capture.failed'))).toBeOnTheScreen();
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'CameraError' });
    expect(screen.getByText(pose('front'))).toBeOnTheScreen();
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    await press(shutter);
    expect(screen.queryByText(t('capture.failed'))).toBeNull();
    expect(screen.getByTestId('capture-preview')).toBeOnTheScreen();
  });

  test('no picture came back: nothing to preview', async () => {
    mockTake.mockResolvedValueOnce(undefined as never);
    await show();
    await press(timerLabel(0));
    await press(shutter);
    expect(screen.queryByTestId('capture-preview')).toBeNull();
    expect(screen.getByTestId('camera')).toBeOnTheScreen();
  });
});

describe('the result', () => {
  test('first set: both photos, a title for the week, the next set, when Compare opens, on this phone only', async () => {
    await startFirstSet();
    await press(timerLabel(0));
    await useFront();
    await useFront();
    expect(screen.getByText(t('capture.done.title', { week: 1 }))).toBeOnTheScreen();
    expect(screen.getByTestId('capture-saved-front')).toHaveProp('source', { uri: 'file:///docs/2026-10-07-front.jpg' });
    expect(screen.getByTestId('capture-saved-side')).toHaveProp('source', { uri: 'file:///docs/2026-10-07-side.jpg' });
    expect(screen.getByLabelText(t('capture.done.photo', { pose: t('capture.done.front') }))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('capture.done.photo', { pose: t('capture.done.side') }))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.done.front'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.done.side'))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.done.next'))).toBeOnTheScreen();
    // 2026-10-07 + photo_interval_weeks (4) weeks = Nov 4, in week 1 + 4.
    expect(screen.getByText(t('capture.done.nextOn', { week: 5, date: 'Nov 4' }))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.done.compareLater'))).toBeOnTheScreen();
    expect(maybeButton(t('capture.done.compare'))).toBeNull();
    expect(screen.getByText(t('capture.done.onPhone'))).toBeOnTheScreen();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled(); // it ends in a result, not by closing
  });

  test('Done goes back', async () => {
    await show();
    await useFront();
    await useFront();
    await press(t('capture.done.done'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the photos are the ones the folder now holds, from the library or the camera', async () => {
    await show();
    await press(t('capture.library'));
    await press(use);
    await useFront();
    expect(mockServices.photos.add).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('capture-saved-front')).toBeOnTheScreen();
  });

  test('a second set: the week from the first photo day, the next set, and Compare, which opens the comparison', async () => {
    await show();
    await useFront();
    await useFront();
    // 2026-09-09 to 2026-10-07 is 28 days: week 5; the next set 4 weeks on is week 9, Nov 4.
    expect(screen.getByText(t('capture.done.title', { week: 5 }))).toBeOnTheScreen();
    expect(screen.getByText(t('capture.done.nextOn', { week: 9, date: 'Nov 4' }))).toBeOnTheScreen();
    expect(screen.queryByText(t('capture.done.compareLater'))).toBeNull();
    await press(t('capture.done.compare'));
    expect(mockReplace).toHaveBeenCalledWith('/compare');
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('a second set offers Compare and Done both', async () => {
    await show();
    await useFront();
    await useFront();
    expect(button(t('capture.done.compare'))).toBeOnTheScreen();
    expect(button(t('capture.done.done'))).toBeOnTheScreen();
  });

  test('the result is the page in the chosen theme, not the camera dark', async () => {
    await show();
    await useFront();
    await useFront();
    expect(screen.getByText(t('capture.done.next'))).toHaveStyle({ color: palettes.light.muted });
  });

  test('the same day again: the earlier set that day is replaced, not counted as a second day', async () => {
    mockChecks = [{ takenOn: '2026-10-07', photos: { front: 'file:///docs/2026-10-07-front.jpg', side: 'file:///docs/2026-10-07-side.jpg' } }];
    await show();
    await useFront();
    await useFront();
    expect(screen.getByText(t('capture.done.title', { week: 1 }))).toBeOnTheScreen();
    expect(maybeButton(t('capture.done.compare'))).toBeNull();
  });
});

describe('closing', () => {
  test('Close on the camera goes back without a photo', async () => {
    await show();
    await press(t('capture.close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).not.toHaveBeenCalled();
  });

  test('Close on the side keeps nothing more: the front already used stays kept, and that is all', async () => {
    await show();
    await useFront();
    await press(t('capture.close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).toHaveBeenCalledTimes(1);
    expect(mockServices.photos.add).toHaveBeenCalledWith('file:///cache/Camera/shot.jpg', '2026-10-07', 'front');
  });

  test('a picture not yet used is not kept: Retake and Close leave nothing', async () => {
    await show();
    await press(timerLabel(0));
    await press(shutter);
    await press(retake);
    await press(t('capture.close'));
    expect(mockServices.photos.add).not.toHaveBeenCalled();
  });

  test('closed while the camera is still taking: the late photo is not previewed or kept, and nothing goes back twice', async () => {
    const shot = deferred<Picture>();
    mockTake.mockImplementationOnce(() => shot.promise);
    await show();
    await press(timerLabel(0));
    await fireEvent.press(button(shutter));
    await press(t('capture.close'));
    await screen.unmount();
    await act(async () => shot.settle(shotAt('file:///cache/Camera/shot.jpg')));
    expect(mockServices.photos.add).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('left while the photo is being kept: no result, no second going back', async () => {
    await show();
    await useFront();
    const kept = deferred<never>();
    mockServices.photos.add.mockImplementationOnce(() => kept.promise);
    await press(timerLabel(0));
    await press(shutter);
    await fireEvent.press(button(use));
    await screen.unmount();
    await act(async () => kept.settle(undefined as never));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
