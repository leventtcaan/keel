/**
 * The phone's side of handing a sticker on (K-612, K-975): the PNG written to the cache with expo-file-system, the share
 * sheet opened with React Native's Share, the file removed after (shareImage.ts). Here, under src/share, so the scan that
 * keeps the share code off the server and the photos (share-sticker-view.test.tsx) reads the code that does the writing too.
 * React Native's Share takes a file `url` on iOS only (Share.d.ts): the product is iOS first.
 */
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import { type OpenFile, shareCardImage } from './shareImage';

/** A file in this app's cache for an image to be handed on; removing it when it was never written is not an error. */
export const cacheFile: OpenFile = (name) => {
  const file = new File(Paths.cache, name);
  // A write that failed may have left nothing: only a file there is removed.
  return { uri: file.uri, write: (data) => file.write(data, { encoding: 'base64' }), remove: () => (file.exists ? file.delete() : undefined) };
};

export function deviceShareImage(report: (problem: { name: string }) => void): (base64: string) => Promise<void> {
  return (base64) =>
    shareCardImage(base64, {
      openFile: cacheFile,
      // Closed without sharing is not a failure: the sheet answers (shared or dismissed) and either way the file goes.
      share: async (uri) => void (await Share.share({ url: uri })),
      report,
    });
}
