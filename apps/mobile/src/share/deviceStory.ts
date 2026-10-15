/**
 * The phone's side of Stories (K-976): react-native-share for the hand-over to Instagram, the URL scheme for knowing it is
 * there, expo-file-system for the sticker's file (removed after, story.ts). Here, under src/share, so the scan that keeps
 * the share code off the server and the photos reads the code that does the handing too.
 */
import Share, { Social } from 'react-native-share';
import { Linking } from 'react-native';

import { cacheFile } from './deviceShare';
import { type StoryInput, type StoryResult, shareStory } from './story';

/** Instagram's Stories scheme: also what `LSApplicationQueriesSchemes` in app.config.ts lets the app ask about. */
export const STORIES_SCHEME = 'instagram-stories://share';

export function deviceShareStory(report: (problem: { name: string }) => void, appId: string | undefined): (input: StoryInput) => Promise<StoryResult> {
  return (input) =>
    shareStory(input, {
      appId,
      canOpen: () => Linking.canOpenURL(STORIES_SCHEME),
      shareSingle: async (options) => void (await Share.shareSingle({ ...options, social: Social.InstagramStories, appId: appId ?? '' })),
      openFile: cacheFile,
      report,
    });
}
