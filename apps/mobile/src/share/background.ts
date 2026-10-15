/**
 * The photo behind a sticker (K-975, ADR-076 #3): the user's own, from the system's photo picker (no permission on iOS 14+)
 * or the camera (asked once), kept on the phone and used only to draw the image that goes to the share sheet. The progress
 * photos (K-614) are the app's private files and are not in the picker. Images only (a video background is K-976), no EXIF.
 */
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type Source = 'gallery' | 'camera';

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false };

/** The photo's file, or null when the user closed the picker, or 'denied' when the camera is not allowed. */
export async function pickBackground(source: Source): Promise<{ uri: string } | 'denied' | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset === undefined ? null : { uri: asset.uri };
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
