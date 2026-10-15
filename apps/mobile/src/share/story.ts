/**
 * The sticker to Instagram Stories (K-976, ADR-076 #5): the sticker as its own layer over the user's photo or video, or
 * over a plain colour when the background is to be picked in Instagram. Instagram's Story needs the Facebook App ID (since
 * January 2023) and the app on the phone; without either the answer is "unavailable" and the screen falls back to the
 * system share sheet. The sticker's file is in the cache only for the hand-over and removed in every case; the photo or
 * video is the user's own file, only named here. Nothing is sent by the app: Instagram receives it on the phone.
 */
import { type OpenFile, withCacheFile } from './shareImage';

export type StoryBackground = { kind: 'image'; uri: string } | { kind: 'video'; uri: string } | { kind: 'color'; hex: string };
export type StoryInput = { sticker: string; background: StoryBackground };
/** opened: Instagram has it · unavailable: no App ID or no Instagram, nothing was done · cancelled: left unfinished. */
export type StoryResult = 'opened' | 'unavailable' | 'cancelled';

/** What the library takes for Stories (the iOS code reads these keys, checked in react-native-share 12.3.1). */
export type StoryOptions = {
  stickerImage: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
};

type Deps = {
  /** The Facebook App ID, from configuration; absent or blank means Stories are not set up. */
  appId: string | undefined;
  /** Whether Instagram is on the phone (iOS has no answer from the library, only from the URL scheme). */
  canOpen(): Promise<boolean>;
  shareSingle(options: StoryOptions): Promise<void>;
  openFile: OpenFile;
  report?(problem: { name: string }): void;
};

const FILE = 'next-call-story-sticker.png';
/** The library rejects with this text when the user closes the share without finishing (react-native-share, index.tsx). */
const CLOSED = /user did not share/i;

function options(sticker: string, background: StoryBackground): StoryOptions {
  switch (background.kind) {
    case 'image':
      return { stickerImage: sticker, backgroundImage: background.uri };
    case 'video':
      return { stickerImage: sticker, backgroundVideo: background.uri };
    case 'color':
      // Both ends the same: left out, Instagram paints its own purple gradient behind the sticker.
      return { stickerImage: sticker, backgroundTopColor: background.hex, backgroundBottomColor: background.hex };
  }
}

export async function shareStory({ sticker, background }: StoryInput, { appId, canOpen, shareSingle, openFile, report }: Deps): Promise<StoryResult> {
  if (appId === undefined || appId.trim() === '') return 'unavailable';
  if (!(await canOpen().catch(() => false))) return 'unavailable';
  try {
    await withCacheFile({ openFile, report }, FILE, sticker, (uri) => shareSingle(options(uri, background)));
    return 'opened';
  } catch (error) {
    if (error instanceof Error && CLOSED.test(error.message)) return 'cancelled';
    throw error;
  }
}
