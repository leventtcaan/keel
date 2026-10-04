/**
 * The phone's side of handing the card on (K-612): the PNG written to the cache with expo-file-system, the share sheet
 * opened with React Native's Share, the file removed after (shareImage.ts). Here, under src/share, so the scan that keeps
 * the card off the server and the photos (share-card-view.test.tsx) reads the code that does the writing too.
 * React Native's Share takes a file `url` on iOS only (Share.d.ts): the product is iOS first (ADR-054).
 */
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import { shareCardImage } from './shareImage';

export function deviceShareImage(report: (problem: { name: string }) => void): (base64: string) => Promise<void> {
  return (base64) =>
    shareCardImage(base64, {
      saveImage: (name, data) => {
        const file = new File(Paths.cache, name);
        file.write(data, { encoding: 'base64' });
        return { uri: file.uri, remove: () => file.delete() };
      },
      share: async (uri) => void (await Share.share({ url: uri })),
      report,
    });
}
