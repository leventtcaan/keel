/**
 * The sticker to Instagram Stories (K-976, ADR-076 #5): the sticker as its own layer over the user's photo or video, or
 * over a plain colour when the background is to be picked in Instagram. Needs the Facebook App ID and Instagram on the
 * phone; without either the answer is "unavailable" and the screen falls back to the system share sheet. A Story left
 * unfinished is the user's choice, not a failure. The sticker's temporary file is removed in every case.
 */
import { shareStory } from '@/share/story';

function deps(over: Partial<{ appId: string | undefined; canOpen: () => Promise<boolean>; shareSingle: (o: object) => Promise<void>; removeFails: boolean; writeFails: boolean }> = {}) {
  const removed: string[] = [];
  const written: [string, string][] = [];
  const value = {
    appId: 'app-id-for-tests' as string | undefined,
    canOpen: jest.fn(async () => true),
    shareSingle: jest.fn(async (_options: object) => {}),
    openFile: jest.fn((name: string) => ({
      uri: `file:///cache/${name}`,
      write: (base64: string) => {
        if (over.writeFails) throw Object.assign(new Error('full'), { name: 'WriteFailed' });
        written.push([name, base64]);
      },
      remove: () => {
        if (over.removeFails) throw Object.assign(new Error('busy'), { name: 'RemoveFailed' });
        removed.push(name);
      },
    })),
    report: jest.fn(),
    ...over,
  };
  return { value, removed, written };
}

const STICKER = 'iVBORw0KGgo=';

test("a photo: the sticker's file and the photo itself, the App ID; the file is removed after", async () => {
  const { value, removed, written } = deps();

  await expect(shareStory({ sticker: STICKER, background: { kind: 'image', uri: 'file:///cache/ImagePicker/a.jpg' } }, value)).resolves.toBe('opened');

  expect(written).toEqual([['keel-story-sticker.png', STICKER]]);
  expect(value.shareSingle).toHaveBeenCalledWith({ stickerImage: 'file:///cache/keel-story-sticker.png', backgroundImage: 'file:///cache/ImagePicker/a.jpg' });
  expect(removed).toEqual(['keel-story-sticker.png']);
});

test('a video: the video file as the background, no image', async () => {
  const { value } = deps();

  await shareStory({ sticker: STICKER, background: { kind: 'video', uri: 'file:///cache/ImagePicker/v.mov' } }, value);

  expect(value.shareSingle).toHaveBeenCalledWith({ stickerImage: 'file:///cache/keel-story-sticker.png', backgroundVideo: 'file:///cache/ImagePicker/v.mov' });
});

test('a colour (dark, or "In Instagram"): both ends of the background the same, so Instagram does not paint its own', async () => {
  const { value } = deps();

  await shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value);

  expect(value.shareSingle).toHaveBeenCalledWith({
    stickerImage: 'file:///cache/keel-story-sticker.png',
    backgroundTopColor: '#0E1010',
    backgroundBottomColor: '#0E1010',
  });
});

describe('without what Stories need: unavailable, nothing written, nothing opened', () => {
  test.each([
    ['no App ID', { appId: undefined }],
    ['a blank App ID', { appId: '  ' }],
    ['Instagram not on the phone', { canOpen: async () => false }],
    ['the phone cannot say whether Instagram is there', { canOpen: async () => Promise.reject(new Error('x')) }],
  ])('%s', async (_, over) => {
    const { value, written } = deps(over);

    await expect(shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value)).resolves.toBe('unavailable');

    expect(written).toEqual([]);
    expect(value.shareSingle).not.toHaveBeenCalled();
  });

  test('no App ID: Instagram is not even asked about', async () => {
    const { value } = deps({ appId: undefined });
    await shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value);
    expect(value.canOpen).not.toHaveBeenCalled();
  });
});

describe('what goes wrong after it started', () => {
  test('a Story closed without sharing is a choice, not a failure; the file goes', async () => {
    const { value, removed } = deps({ shareSingle: async () => Promise.reject(new Error('User did not share')) });

    await expect(shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value)).resolves.toBe('cancelled');
    expect(removed).toEqual(['keel-story-sticker.png']);
    expect(value.report).not.toHaveBeenCalled();
  });

  test('any other failure reaches the screen, and the file goes', async () => {
    const { value, removed } = deps({ shareSingle: async () => Promise.reject(Object.assign(new Error('boom'), { name: 'ShareFailed' })) });

    await expect(shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value)).rejects.toMatchObject({ name: 'ShareFailed' });
    expect(removed).toEqual(['keel-story-sticker.png']);
  });

  test('a file that could not be written: no Story, the failure reaches the screen, nothing left', async () => {
    const { value, removed } = deps({ writeFails: true });

    await expect(shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value)).rejects.toMatchObject({ name: 'WriteFailed' });
    expect(value.shareSingle).not.toHaveBeenCalled();
    expect(removed).toEqual(['keel-story-sticker.png']);
  });

  test('a file that could not be removed is reported by name; the Story still opened', async () => {
    const { value } = deps({ removeFails: true });

    await expect(shareStory({ sticker: STICKER, background: { kind: 'color', hex: '#0E1010' } }, value)).resolves.toBe('opened');
    expect(value.report).toHaveBeenCalledWith({ name: 'RemoveFailed' });
  });
});
