/**
 * The photo or video behind a sticker (K-975, K-976; ADR-076 #3): the user's own, from the system's picker (no permission on
 * iOS 14+) or the camera (asked once), kept on the phone and used only to draw the image that goes to the share sheet, or to
 * sit behind the sticker in an Instagram Story. The progress photos (K-614) are the app's private files and are not in the
 * picker. No EXIF.
 */
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { shareParams } from './params';

export type Source = 'gallery' | 'camera';

const OPTIONS = { quality: 1, exif: false, base64: false, allowsEditing: false } as const;

export type Picked = { uri: string; video?: true };

/**
 * The photo's (or video's) file; null when the user closed the picker; 'denied' when the camera is not allowed; 'tooLong'
 * for a video past the Story's limit (share.json), or of a length the picker does not know, which is not used and whose
 * copy is removed. The library gives photos and videos; the camera photos only: a video would ask for the microphone.
 */
export async function pickBackground(source: Source): Promise<Picked | 'denied' | 'tooLong' | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...OPTIONS, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ ...OPTIONS, mediaTypes: ['images', 'videos'] });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;
  if (asset.type !== 'video') return { uri: asset.uri };
  if (asset.duration == null || asset.duration > shareParams.storyVideoSeconds * 1000) {
    discardBackground(asset.uri);
    return 'tooLong';
  }
  return { uri: asset.uri, video: true };
}

/**
 * Removes the picker's copy of the photo. Only a copy in this app's cache: a picker that ever handed back the library's own
 * file (an Android content://, a document) would otherwise lose the user's photo.
 */
export function discardBackground(uri: string): void {
  const cache = Paths.cache.uri.endsWith('/') ? Paths.cache.uri : `${Paths.cache.uri}/`;
  if (!uri.startsWith(cache)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
