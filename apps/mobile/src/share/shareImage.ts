/**
 * The sticker handed to the share sheet (K-612, K-975): the image made on this phone is written to the cache only so the
 * sheet has a file, and removed afterwards whatever happened (shared, closed without sharing, a write or the sheet that
 * failed) — as the data export does (K-309). The app sends it nowhere; where it goes is the user's choice in the sheet.
 */
type File = {
  uri: string;
  /** Writes the PNG for the sheet; the phone's is expo-file-system in the cache directory. */
  write(base64: string): void;
  remove(): void;
};

type Deps = {
  openFile(name: string): File;
  share(uri: string): Promise<void>;
  /** A file the phone could not remove, by name (V3); the OS clears the cache in time. */
  report?(problem: { name: string }): void;
};

const FILE = 'keel-sticker.png';

export async function shareCardImage(base64: string, { openFile, share, report = () => {} }: Deps): Promise<void> {
  const file = openFile(FILE);
  try {
    file.write(base64);
    await share(file.uri);
  } finally {
    try {
      file.remove();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
  }
}
