/**
 * The phone's side of sharing a sticker (K-612, K-975): base64 written as the PNG it is, the file's url to the share sheet (not a
 * message), the file removed after — and nothing else: no request of any kind.
 */
import { deviceShareImage } from '@/share/deviceShare';

const mockWrites: [string, string, unknown][] = [];
const mockDeleted: string[] = [];
let mockWriteFails = false;
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' } },
  File: class {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return mockWrites.some(([uri]) => uri === this.uri) && !mockDeleted.includes(this.uri);
    }
    write(data: string, options: unknown) {
      if (mockWriteFails) throw Object.assign(new Error('full'), { name: 'WriteFailed' });
      mockWrites.push([this.uri, data, options]);
    }
    delete() {
      if (!this.exists) throw new Error('no such file');
      mockDeleted.push(this.uri);
    }
  },
}));
const mockShare = jest.fn(async (_content: unknown): Promise<{ action: string }> => ({ action: 'sharedAction' }));
jest.mock('react-native', () => ({ Share: { share: (content: unknown) => mockShare(content) } }));

beforeEach(() => {
  mockWrites.length = 0;
  mockDeleted.length = 0;
  mockWriteFails = false;
  mockShare.mockClear();
});

test('written as base64, its url to the sheet, removed after; no request', async () => {
  const fetchSpy = jest.fn();
  global.fetch = fetchSpy;

  await deviceShareImage(jest.fn())('iVBORw0KGgo=');

  expect(mockWrites).toEqual([['file:///cache/next-call-sticker.png', 'iVBORw0KGgo=', { encoding: 'base64' }]]);
  expect(mockShare).toHaveBeenCalledWith({ url: 'file:///cache/next-call-sticker.png' });
  expect(mockDeleted).toEqual(['file:///cache/next-call-sticker.png']);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('a sheet closed without sharing: the file is removed all the same', async () => {
  mockShare.mockResolvedValueOnce({ action: 'dismissedAction' });

  await deviceShareImage(jest.fn())('iVBORw0KGgo=');

  expect(mockDeleted).toEqual(['file:///cache/next-call-sticker.png']);
});

test('a file that could not be written: no sheet, nothing to remove, the failure reaches the screen', async () => {
  mockWriteFails = true;
  const report = jest.fn();

  await expect(deviceShareImage(report)('iVBORw0KGgo=')).rejects.toMatchObject({ name: 'WriteFailed' });

  expect(mockShare).not.toHaveBeenCalled();
  expect(mockDeleted).toEqual([]);
  expect(report).not.toHaveBeenCalled();
});

test('a sheet that fails: the file is removed and the failure reaches the screen', async () => {
  mockShare.mockRejectedValueOnce(Object.assign(new Error('closed'), { name: 'ShareFailed' }));

  await expect(deviceShareImage(jest.fn())('iVBORw0KGgo=')).rejects.toMatchObject({ name: 'ShareFailed' });

  expect(mockDeleted).toEqual(['file:///cache/next-call-sticker.png']);
});
