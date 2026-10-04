/**
 * The native side of a meal photo (K-408, V1): the camera asks first and a refusal opens nothing; the photo is asked for
 * without EXIF and without base64; it is always written again as a JPEG — resized only when its own rendered size is
 * over the limit (a picker that reports no size is not trusted) — and the size reported is the saved file's, which is
 * what photo.ts checks before anything is sent; with the saved file's place, so it can be deleted after (K-811). A file is
 * deleted when it is there; the cache folders the two modules write to go when the session ends.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { devicePhotoCache, photoTools } from '@/food/photoTools';

type Rendered = { width: number; height: number; saveAsync: jest.Mock };
const rendered = (width: number, height: number, saved: { width: number; height: number; base64?: string } = { width, height, base64: 'BBBB' }): Rendered => ({
  width,
  height,
  saveAsync: jest.fn(async () => ({ uri: 'file:///out.jpg', ...saved })),
});
const context = (image: Rendered) => ({ resize: jest.fn(), renderAsync: jest.fn(async () => image) });

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: { manipulate: jest.fn() }, SaveFormat: { JPEG: 'jpeg', PNG: 'png' } }));
const mockDeleted: string[] = [];
const mockExisting = new Set<string>();
const mockFailing = new Set<string>();
jest.mock('expo-file-system', () => {
  const path = (parts: unknown[]) => parts.map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri)).join('/');
  class Entry {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = path(parts);
    }
    get exists() {
      return mockExisting.has(this.uri);
    }
    delete() {
      if (mockFailing.has(this.uri)) throw new Error('locked');
      mockDeleted.push(this.uri);
    }
  }
  return { File: class extends Entry {}, Directory: class extends Entry {}, Paths: { cache: { uri: 'file:///Caches' } } };
});
const picker = jest.mocked(ImagePicker);
const manipulate = jest.mocked(ImageManipulator.manipulate);

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleted.length = 0;
  mockExisting.clear();
  mockFailing.clear();
});

describe('pick', () => {
  const ASSET = { uri: 'file:///p.heic', width: 4032, height: 3024 };

  test('the camera not allowed: denied, and the camera never opens', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(photoTools.pick('camera')).resolves.toBe('denied');
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('the camera allowed: a photo, asked for without EXIF and without base64', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [ASSET] } as never);
    await expect(photoTools.pick('camera')).resolves.toEqual({ uri: ASSET.uri });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], exif: false, base64: false }));
  });

  test('the library is the system picker: no permission asked, the same options', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [ASSET] } as never);
    await expect(photoTools.pick('library')).resolves.toEqual({ uri: ASSET.uri });
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], exif: false, base64: false }));
  });

  test('backed out, or nothing chosen: null', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(photoTools.pick('library')).resolves.toBeNull();
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [] } as never);
    await expect(photoTools.pick('library')).resolves.toBeNull();
  });
});

describe('shrink', () => {
  test('a large photo: resized from its own rendered size to the limit, written as a JPEG at the quality, in base64', async () => {
    const original = rendered(4032, 3024);
    const small = rendered(1024, 768);
    const first = context(original);
    const second = context(small);
    manipulate.mockReturnValueOnce(first as never).mockReturnValueOnce(second as never);

    await expect(photoTools.shrink('file:///p.heic', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 1024, height: 768, uri: 'file:///out.jpg' });
    expect(manipulate).toHaveBeenNthCalledWith(1, 'file:///p.heic');
    expect(manipulate).toHaveBeenNthCalledWith(2, original);
    expect(second.resize).toHaveBeenCalledWith({ width: 1024, height: 768 });
    expect(original.saveAsync).not.toHaveBeenCalled();
    expect(small.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  });

  test('a small photo is still written again (the file it came in is never sent), not resized', async () => {
    const original = rendered(640, 480);
    const only = context(original);
    manipulate.mockReturnValueOnce(only as never);

    await expect(photoTools.shrink('file:///small.jpg', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 640, height: 480, uri: 'file:///out.jpg' });
    expect(manipulate).toHaveBeenCalledTimes(1);
    expect(only.resize).not.toHaveBeenCalled();
    expect(original.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  });

  test('the size reported is the saved file’s, not the one asked for', async () => {
    const original = rendered(4000, 3000);
    const odd = rendered(1024, 768, { width: 1030, height: 770, base64: 'BBBB' });
    manipulate.mockReturnValueOnce(context(original) as never).mockReturnValueOnce(context(odd) as never);
    await expect(photoTools.shrink('file:///p.jpg', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 1030, height: 770, uri: 'file:///out.jpg' });
  });

  test('no base64 back: a failure, never an empty photo', async () => {
    manipulate.mockReturnValueOnce(context(rendered(640, 480, { width: 640, height: 480 })) as never);
    await expect(photoTools.shrink('file:///p.jpg', 1024, 0.8)).rejects.toThrow();
  });
});

describe('nothing left behind (K-811)', () => {
  it('a file written is deleted; one already gone is no error', async () => {
    mockExisting.add('file:///Caches/ImageManipulator/a.jpg');
    await photoTools.discard('file:///Caches/ImageManipulator/a.jpg');
    await photoTools.discard('file:///Caches/ImagePicker/gone.jpg');
    expect(mockDeleted).toEqual(['file:///Caches/ImageManipulator/a.jpg']);
  });

  it('a file outside the cache is never deleted: only the copies this app wrote', async () => {
    mockExisting.add('file:///Library/original.jpg');
    mockExisting.add('content://media/external/images/1');
    await photoTools.discard('file:///Library/original.jpg');
    await photoTools.discard('content://media/external/images/1');
    expect(mockDeleted).toEqual([]);
  });

  it('folders not there: nothing deleted, no error', async () => {
    await expect(devicePhotoCache.clear()).resolves.toBeUndefined();
    expect(mockDeleted).toEqual([]);
  });

  it('one folder that cannot be deleted does not keep the other; the failure is still told', async () => {
    mockExisting.add('file:///Caches/ImagePicker');
    mockExisting.add('file:///Caches/ImageManipulator');
    mockFailing.add('file:///Caches/ImagePicker');
    await expect(devicePhotoCache.clear()).rejects.toThrow();
    expect(mockDeleted).toEqual(['file:///Caches/ImageManipulator']);
  });

  it("at the session's end, the picker's and the manipulator's cache folders go", async () => {
    mockExisting.add('file:///Caches/ImagePicker');
    mockExisting.add('file:///Caches/ImageManipulator');
    await devicePhotoCache.clear();
    expect(mockDeleted.sort()).toEqual(['file:///Caches/ImageManipulator', 'file:///Caches/ImagePicker']);
  });
});
