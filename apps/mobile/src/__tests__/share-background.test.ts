/**
 * The photo behind a sticker (K-975, ADR-076 #3): the user's own, from the system's photo picker or the camera, and it
 * stays on the phone. The picker is the device's library, so the app's own progress photos (K-614), which live in the
 * app's private storage, are not in it. The copy the picker makes in the cache is removed when it is no longer needed.
 */
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/copy';
import { discardBackground, pickBackground } from '@/share/background';

const mockDeleted: string[] = [];
let mockExisting: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockExisting.includes(this.uri);
    }
    delete() {
      if (!this.exists) throw new Error('no such file');
      mockDeleted.push(this.uri);
    }
  },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const ASSET = { uri: 'file:///cache/ImagePicker/a.jpg', width: 3024, height: 4032 };

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleted.length = 0;
  mockExisting = [];
});

describe('the gallery', () => {
  test('the system picker, images only, without EXIF; the chosen photo is returned by its file', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [ASSET] } as never);

    await expect(pickBackground('gallery')).resolves.toEqual({ uri: ASSET.uri });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], exif: false, base64: false, allowsEditing: false }));
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  test('closed without choosing: nothing', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(pickBackground('gallery')).resolves.toBeNull();
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [] } as never);
    await expect(pickBackground('gallery')).resolves.toBeNull();
  });
});

describe('the camera', () => {
  test('asks once; allowed, it takes the photo the same way', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [ASSET] } as never);

    await expect(pickBackground('camera')).resolves.toEqual({ uri: ASSET.uri });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], exif: false, base64: false }));
  });

  test('not allowed: said as denied, the camera never opened', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);

    await expect(pickBackground('camera')).resolves.toBe('denied');
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('the copy in the cache', () => {
  test("removed when it is the app's own copy and still there", () => {
    mockExisting = [ASSET.uri];
    discardBackground(ASSET.uri);
    expect(mockDeleted).toEqual([ASSET.uri]);
  });

  test("a file outside the app's cache is never touched: the user's library is theirs", () => {
    mockExisting = ['file:///private/var/media/DCIM/IMG_1.jpg'];
    discardBackground('file:///private/var/media/DCIM/IMG_1.jpg');
    expect(mockDeleted).toEqual([]);
  });

  test('already gone: nothing to do, no failure', () => {
    expect(() => discardBackground(ASSET.uri)).not.toThrow();
    expect(mockDeleted).toEqual([]);
  });
});

describe('what the system asks the user (the store review reads these)', () => {
  test('the camera text names the share background, and that it stays on the phone', () => {
    expect(t('permissions.camera')).toMatch(/share sticker/i);
    expect(t('permissions.camera')).toMatch(/stays? on this phone/i);
  });

  test('the photos text names the share background too', () => {
    expect(t('permissions.photos')).toMatch(/share sticker/i);
  });
});
