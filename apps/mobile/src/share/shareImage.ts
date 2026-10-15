/**
 * The sticker handed to the share sheet (K-612, K-975): the image made on this phone is written to the cache only so the
 * sheet has a file, and removed afterwards whatever happened (shared, closed without sharing, a write or the sheet that
 * failed) — as the data export does (K-309). The app sends it nowhere; where it goes is the user's choice in the sheet.
 */
export type CacheFile = {
  uri: string;
  /** Writes the PNG; the phone's is expo-file-system in the cache directory. */
  write(base64: string): void;
  remove(): void;
};

export type OpenFile = (name: string) => CacheFile;

type Deps = {
  openFile: OpenFile;
  share(uri: string): Promise<void>;
  /** A file the phone could not remove, by name (V3); the OS clears the cache in time. */
  report?(problem: { name: string }): void;
};

const FILE = 'keel-sticker.png';

/**
 * Writes the image to a cache file, runs `job` with the file's uri, and removes the file whatever happened (done, closed
 * without finishing, a failed write or job). A file that cannot be removed is reported by name, not thrown.
 */
export async function withCacheFile<T>(
  { openFile, report = () => {} }: { openFile: OpenFile; report?: (problem: { name: string }) => void },
  name: string,
  base64: string,
  job: (uri: string) => Promise<T>,
): Promise<T> {
  const file = openFile(name);
  try {
    file.write(base64);
    return await job(file.uri);
  } finally {
    try {
      file.remove();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
  }
}

export async function shareCardImage(base64: string, { openFile, share, report }: Deps): Promise<void> {
  await withCacheFile({ openFile, report }, FILE, base64, share);
}
