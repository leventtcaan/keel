/**
 * The card handed to the share sheet (K-612): the image made on this phone is written to the cache only so the sheet has
 * a file, and removed afterwards whatever happened — as the data export does (K-309). The app sends it nowhere; where it
 * goes is the user's choice in the sheet.
 */
type Deps = {
  /** Writes the PNG for the sheet; the phone's is expo-file-system in the cache directory. */
  saveImage(name: string, base64: string): { uri: string; remove(): void };
  share(uri: string): Promise<void>;
  /** A file the phone could not remove, by name (V3); the OS clears the cache in time. */
  report?(problem: { name: string }): void;
};

const FILE = 'progress-card.png';

export async function shareCardImage(base64: string, { saveImage, share, report = () => {} }: Deps): Promise<void> {
  const file = saveImage(FILE, base64);
  try {
    await share(file.uri);
  } finally {
    try {
      file.remove();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
  }
}
