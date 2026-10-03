/**
 * The native side of a meal photo (K-408, V1): the camera asks first and a refusal opens nothing; the photo is asked for
 * without EXIF and without base64; it is always written again as a JPEG — resized only when its own rendered size is
 * over the limit (a picker that reports no size is not trusted) — and the size reported is the saved file's, which is
 * what photo.ts checks before anything is sent.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { photoTools } from '@/food/photoTools';

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
const picker = jest.mocked(ImagePicker);
const manipulate = jest.mocked(ImageManipulator.manipulate);

beforeEach(() => jest.clearAllMocks());

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

    await expect(photoTools.shrink('file:///p.heic', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 1024, height: 768 });
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

    await expect(photoTools.shrink('file:///small.jpg', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 640, height: 480 });
    expect(manipulate).toHaveBeenCalledTimes(1);
    expect(only.resize).not.toHaveBeenCalled();
    expect(original.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  });

  test('the size reported is the saved file’s, not the one asked for', async () => {
    const original = rendered(4000, 3000);
    const odd = rendered(1024, 768, { width: 1030, height: 770, base64: 'BBBB' });
    manipulate.mockReturnValueOnce(context(original) as never).mockReturnValueOnce(context(odd) as never);
    await expect(photoTools.shrink('file:///p.jpg', 1024, 0.8)).resolves.toEqual({ base64: 'BBBB', width: 1030, height: 770 });
  });

  test('no base64 back: a failure, never an empty photo', async () => {
    manipulate.mockReturnValueOnce(context(rendered(640, 480, { width: 640, height: 480 })) as never);
    await expect(photoTools.shrink('file:///p.jpg', 1024, 0.8)).rejects.toThrow();
  });
});
