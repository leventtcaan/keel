/**
 * Handing the sticker to the share sheet (K-612, K-975): the image made on the phone is written to the cache only to give
 * the sheet a file, and removed afterwards whatever happened (shared, closed without sharing, a failed write or sheet) —
 * like the data export (K-309). Nothing is sent anywhere by the app: where the image goes is the user's choice in the sheet.
 */
import { shareCardImage } from '@/share/shareImage';

function deps(shareFails = false, removeFails = false, writeFails = false) {
  const removed: string[] = [];
  const saved: [string, string][] = [];
  return {
    removed,
    saved,
    openFile: jest.fn((name: string) => ({
      uri: `file:///cache/${name}`,
      write: (base64: string) => {
        if (writeFails) throw Object.assign(new Error('full'), { name: 'WriteFailed' });
        saved.push([name, base64]);
      },
      remove: () => {
        if (removeFails) throw Object.assign(new Error('busy'), { name: 'RemoveFailed' });
        removed.push(name);
      },
    })),
    share: jest.fn(async (_uri: string) => {
      if (shareFails) throw Object.assign(new Error('closed'), { name: 'ShareFailed' });
    }),
    report: jest.fn(),
  };
}

test('written as a PNG, handed to the sheet, then removed', async () => {
  const d = deps();

  await shareCardImage('iVBORw0KGgo=', d);

  expect(d.saved).toEqual([['next-call-sticker.png', 'iVBORw0KGgo=']]);
  expect(d.share).toHaveBeenCalledWith('file:///cache/next-call-sticker.png');
  expect(d.removed).toEqual(['next-call-sticker.png']);
});

test('removed even when the sheet fails; the failure still reaches the screen', async () => {
  const d = deps(true);

  await expect(shareCardImage('iVBORw0KGgo=', d)).rejects.toMatchObject({ name: 'ShareFailed' });
  expect(d.removed).toEqual(['next-call-sticker.png']);
});

test('a file that cannot be removed is reported by name; the share is not a failure', async () => {
  const d = deps(false, true);

  await shareCardImage('iVBORw0KGgo=', d);

  expect(d.report).toHaveBeenCalledWith({ name: 'RemoveFailed' });
});

test('the file stays until the sheet is done with it', async () => {
  const order: string[] = [];
  let close: () => void = () => {};
  const d = deps();
  d.share.mockImplementationOnce(() => new Promise<void>((resolve) => (close = () => (order.push('closed'), resolve()))));
  const openFile = d.openFile;
  d.openFile = jest.fn((name: string) => {
    const file = openFile(name);
    return { ...file, remove: () => (order.push('removed'), file.remove()) };
  });

  const sharing = shareCardImage('iVBORw0KGgo=', d);
  await Promise.resolve();
  expect(order).toEqual([]);
  close();
  await sharing;

  expect(order).toEqual(['closed', 'removed']);
});

test('removed even when the file could not be written whole; the failure still reaches the screen, and the sheet is never opened', async () => {
  const d = deps(false, false, true);

  await expect(shareCardImage('iVBORw0KGgo=', d)).rejects.toMatchObject({ name: 'WriteFailed' });
  expect(d.share).not.toHaveBeenCalled();
  expect(d.removed).toEqual(['next-call-sticker.png']);
});

test('a sheet closed without sharing is not a failure, and the file goes all the same', async () => {
  const d = deps();
  d.share.mockResolvedValueOnce(undefined);

  await expect(shareCardImage('iVBORw0KGgo=', d)).resolves.toBeUndefined();
  expect(d.removed).toEqual(['next-call-sticker.png']);
  expect(d.report).not.toHaveBeenCalled();
});
