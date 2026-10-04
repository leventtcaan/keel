/**
 * Handing the card to the share sheet (K-612): the image made on the phone is written to the cache only to give the
 * sheet a file, and removed afterwards whatever happened — like the data export (K-309). Nothing is sent anywhere by
 * the app: where the image goes is the user's choice in the sheet.
 */
import { shareCardImage } from '@/share/shareImage';

function deps(shareFails = false, removeFails = false) {
  const removed: string[] = [];
  const saved: [string, string][] = [];
  return {
    removed,
    saved,
    saveImage: jest.fn((name: string, base64: string) => {
      saved.push([name, base64]);
      return {
        uri: `file:///cache/${name}`,
        remove: () => {
          if (removeFails) throw Object.assign(new Error('busy'), { name: 'RemoveFailed' });
          removed.push(name);
        },
      };
    }),
    share: jest.fn(async (_uri: string) => {
      if (shareFails) throw Object.assign(new Error('closed'), { name: 'ShareFailed' });
    }),
    report: jest.fn(),
  };
}

test('written as a PNG, handed to the sheet, then removed', async () => {
  const d = deps();

  await shareCardImage('iVBORw0KGgo=', d);

  expect(d.saved).toEqual([['progress-card.png', 'iVBORw0KGgo=']]);
  expect(d.share).toHaveBeenCalledWith('file:///cache/progress-card.png');
  expect(d.removed).toEqual(['progress-card.png']);
});

test('removed even when the sheet fails; the failure still reaches the screen', async () => {
  const d = deps(true);

  await expect(shareCardImage('iVBORw0KGgo=', d)).rejects.toMatchObject({ name: 'ShareFailed' });
  expect(d.removed).toEqual(['progress-card.png']);
});

test('a file that cannot be removed is reported by name; the share is not a failure', async () => {
  const d = deps(false, true);

  await shareCardImage('iVBORw0KGgo=', d);

  expect(d.report).toHaveBeenCalledWith({ name: 'RemoveFailed' });
});
