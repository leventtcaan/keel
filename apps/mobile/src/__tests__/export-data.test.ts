/**
 * Exporting the account (K-309, K-214, GDPR Art. 20): everything the server holds, as one JSON file the user can keep
 * or send anywhere. The file is written to the phone's cache only for the share sheet and removed afterwards: health
 * data does not stay lying around in a cache.
 */
import { createApiClient } from '@/api/client';
import { exportAccount } from '@/settings/exportData';

const BASE = 'https://api.example.test';
const EXPORT = { exportedAt: '2026-09-30T20:00:00Z', sections: { profile: { units: 'METRIC' } } };

function setup(answer: () => Promise<Response>) {
  const files: { name: string; content: string; removed: boolean }[] = [];
  const shared: string[] = [];
  const deps = {
    api: createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch: jest.fn(answer) }),
    saveFile: (name: string, content: string) => {
      const file = { name, content, removed: false };
      files.push(file);
      return { uri: `file:///cache/${name}`, remove: () => void (file.removed = true) };
    },
    share: jest.fn(async (uri: string) => void shared.push(uri)),
    now: new Date('2026-09-30T21:30:00Z'),
  };
  return { deps, files, shared };
}

const json = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('the export is written as a dated JSON file, shared, then removed from the cache', async () => {
  const { deps, files, shared } = setup(json(200, EXPORT));
  await exportAccount(deps);
  expect(files).toHaveLength(1);
  expect(files[0].name).toBe('keel-export-2026-09-30.json');
  expect(JSON.parse(files[0].content)).toEqual(EXPORT);
  expect(shared).toEqual(['file:///cache/keel-export-2026-09-30.json']);
  expect(files[0].removed).toBe(true);
});

test('the file is removed even when the share sheet fails', async () => {
  const { deps, files } = setup(json(200, EXPORT));
  deps.share.mockRejectedValueOnce(new Error('share'));
  await expect(exportAccount(deps)).rejects.toThrow('share');
  expect(files[0].removed).toBe(true);
});

test('no answer is NoConnection; a refusal is ExportFailed; nothing is written either way', async () => {
  const offline = setup(async () => {
    throw new TypeError('Network request failed');
  });
  await expect(exportAccount(offline.deps)).rejects.toMatchObject({ name: 'NoConnection' });
  const refused = setup(json(500, { code: 'INTERNAL', message: 'x' }));
  await expect(exportAccount(refused.deps)).rejects.toMatchObject({ name: 'ExportFailed' });
  expect([...offline.files, ...refused.files]).toEqual([]);
});

test('a file the phone cannot remove does not turn a done export into a failure: it is reported by name', async () => {
  const problems: string[] = [];
  const { deps } = setup(json(200, EXPORT));
  const saveFile = deps.saveFile;
  const withStuckFile = {
    ...deps,
    report: (problem: { name: string }) => void problems.push(problem.name),
    saveFile: (name: string, content: string) => ({
      ...saveFile(name, content),
      remove: () => {
        throw Object.assign(new Error('busy'), { name: 'FileError' });
      },
    }),
  };
  await exportAccount(withStuckFile);
  expect(problems).toEqual(['FileError']);
});
