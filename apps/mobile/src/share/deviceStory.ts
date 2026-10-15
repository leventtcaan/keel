/**
 * The phone's side of Stories (K-976): react-native-share for the hand-over to Instagram, the URL scheme for knowing it is
 * there, expo-file-system for the sticker's file (removed after, story.ts). Here, under src/share, so the scan that keeps
 * the share code off the server and the photos reads the code that does the handing too.
 *
 * The library is native and asked for lazily, as HealthKit and RevenueCat are (healthKit.ts, revenueCat.ts): the app
 * starts in a build that does not have it yet (an older development build), where an import at the top would throw as the
 * services load. Then Stories are unavailable, said by name, and the share sheet takes over.
 */
import { Linking } from 'react-native';

import { cacheFile } from './deviceShare';
import { type StoryInput, type StoryResult, shareStory } from './story';

/** Instagram's Stories scheme: also what `LSApplicationQueriesSchemes` in app.config.ts lets the app ask about. */
export const STORIES_SCHEME = 'instagram-stories://share';

type Library = {
  default: { shareSingle(options: object): Promise<unknown> };
  Social: { InstagramStories: string };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadLibrary = () => require('react-native-share') as Library;

export function deviceShareStory(
  report: (problem: { name: string }) => void,
  appId: string | undefined,
  load: () => Library = loadLibrary,
): (input: StoryInput) => Promise<StoryResult> {
  let library: Library | null = null;
  // Nothing to load without an App ID: Stories are off, whatever the build has.
  if (appId !== undefined) {
    try {
      library = load();
    } catch {
      report({ name: 'ShareModuleMissing' });
    }
  }
  // A build without the library is a build without Stories: the same answer as no App ID.
  const usable = library === null ? undefined : appId;
  return (input) =>
    shareStory(input, {
      appId: usable,
      canOpen: () => Linking.canOpenURL(STORIES_SCHEME),
      shareSingle: async (options) => {
        if (library === null || usable === undefined) return;
        await library.default.shareSingle({ ...options, social: library.Social.InstagramStories, appId: usable });
      },
      openFile: cacheFile,
      report,
    });
}
