/**
 * The phone's side of sharing the card (K-612): base64 written as the PNG it is, the file's url to the share sheet (not a
 * message), the file removed after — and nothing else: no request of any kind.
 */
import { deviceShareImage } from '@/share/deviceShare';

const mockWrites: [string, string, unknown][] = [];
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' } },
  File: class {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    write(data: string, options: unknown) {
      mockWrites.push([this.uri, data, options]);
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  },
}));
const mockShare = jest.fn(async (_content: unknown) => ({ action: 'sharedAction' }));
jest.mock('react-native', () => ({ Share: { share: (content: unknown) => mockShare(content) } }));

test('written as base64, its url to the sheet, removed after; no request', async () => {
  const fetchSpy = jest.fn();
  global.fetch = fetchSpy;

  await deviceShareImage(jest.fn())('iVBORw0KGgo=');

  expect(mockWrites).toEqual([['file:///cache/progress-card.png', 'iVBORw0KGgo=', { encoding: 'base64' }]]);
  expect(mockShare).toHaveBeenCalledWith({ url: 'file:///cache/progress-card.png' });
  expect(mockDeleted).toEqual(['file:///cache/progress-card.png']);
  expect(fetchSpy).not.toHaveBeenCalled();
});
