/**
 * The account export (K-309; K-214, GDPR Art. 20: the user's data in a structured, machine-readable format). The server
 * gathers every module's section; the phone writes it to a dated JSON file in the cache only to hand it to the share
 * sheet, and removes it afterwards — whatever happened — so health data does not stay in a cache.
 */
import type { ApiClient } from '@/api/client';

type Deps = {
  api: ApiClient;
  /** Writes a file for the share sheet; the phone's is expo-file-system in the cache directory. */
  saveFile(name: string, content: string): { uri: string; remove(): void };
  share(uri: string): Promise<void>;
  now: Date;
};

const named = (name: 'NoConnection' | 'ExportFailed', message: string) => Object.assign(new Error(message), { name });

export async function exportAccount({ api, saveFile, share, now }: Deps): Promise<void> {
  let answer;
  try {
    answer = await api.GET('/v1/account/export');
  } catch {
    throw named('NoConnection', 'export: no answer');
  }
  if (answer.data === undefined) throw named('ExportFailed', `export failed with HTTP ${answer.response.status}`);
  // The day in the file name is only a label for the user; the export carries its own exact time (exportedAt).
  const file = saveFile(`keel-export-${now.toISOString().slice(0, 10)}.json`, JSON.stringify(answer.data, null, 2));
  try {
    await share(file.uri);
  } finally {
    file.remove();
  }
}
