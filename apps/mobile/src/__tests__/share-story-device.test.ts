/**
 * The phone's side of Stories (K-976): Instagram is asked for by its URL scheme (iOS gives the library no other way), the
 * library is given the sticker, the background and the App ID from configuration, and the sticker's file is removed after.
 * The App ID is configuration, never code (K2): EXPO_PUBLIC_FACEBOOK_APP_ID; without it Stories are unavailable.
 */
import { deviceShareStory } from '@/share/deviceStory';
import { parseAppId } from '@/share/storyConfig';

const mockWrites: string[] = [];
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' } },
  File: class {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return mockWrites.includes(this.uri) && !mockDeleted.includes(this.uri);
    }
    write() {
      mockWrites.push(this.uri);
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  },
}));
const mockCanOpen = jest.fn(async (_url: string) => true);
jest.mock('react-native', () => ({ Linking: { canOpenURL: (url: string) => mockCanOpen(url) } }));
const mockShareSingle = jest.fn(async (_options: object) => ({ success: true, message: '' }));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { shareSingle: (options: object) => mockShareSingle(options) },
  Social: { InstagramStories: 'instagramstories' },
}));

const INPUT = { sticker: 'iVBORw0KGgo=', background: { kind: 'image' as const, uri: 'file:///cache/ImagePicker/a.jpg' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockWrites.length = 0;
  mockDeleted.length = 0;
  mockCanOpen.mockResolvedValue(true);
});

describe('the App ID is configuration', () => {
  test('a value is used as it is, trimmed; nothing, or blanks, is not an App ID', () => {
    expect(parseAppId(' 1234567890 ')).toBe('1234567890');
    expect(parseAppId(undefined)).toBeUndefined();
    expect(parseAppId('')).toBeUndefined();
    expect(parseAppId('   ')).toBeUndefined();
  });
});

describe('with the App ID', () => {
  test('Instagram asked for by its Stories scheme; the library given the social, the App ID, the sticker file and the photo', async () => {
    await expect(deviceShareStory(jest.fn(), '1234567890')(INPUT)).resolves.toBe('opened');

    expect(mockCanOpen).toHaveBeenCalledWith('instagram-stories://share');
    expect(mockShareSingle).toHaveBeenCalledWith({
      social: 'instagramstories',
      appId: '1234567890',
      stickerImage: 'file:///cache/keel-story-sticker.png',
      backgroundImage: 'file:///cache/ImagePicker/a.jpg',
    });
  });

  test('the sticker is written to the cache as base64 PNG and removed after, and the app asks nothing of the network', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    await deviceShareStory(jest.fn(), '1234567890')(INPUT);

    expect(mockWrites).toEqual(['file:///cache/keel-story-sticker.png']);
    expect(mockDeleted).toEqual(['file:///cache/keel-story-sticker.png']);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Instagram not installed: unavailable, the library never called, no file written', async () => {
    mockCanOpen.mockResolvedValue(false);

    await expect(deviceShareStory(jest.fn(), '1234567890')(INPUT)).resolves.toBe('unavailable');
    expect(mockShareSingle).not.toHaveBeenCalled();
    expect(mockWrites).toEqual([]);
  });
});

test('without the App ID: unavailable, Instagram never asked, the library never called (the share sheet takes over)', async () => {
  await expect(deviceShareStory(jest.fn(), undefined)(INPUT)).resolves.toBe('unavailable');

  expect(mockCanOpen).not.toHaveBeenCalled();
  expect(mockShareSingle).not.toHaveBeenCalled();
});
