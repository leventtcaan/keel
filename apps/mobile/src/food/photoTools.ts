/**
 * The native side of a meal photo (K-408): the system's camera or photo picker (expo-image-picker) and the shrinking
 * (expo-image-manipulator, SDK 57 — `manipulate → resize → renderAsync → saveAsync`, checked against the installed types).
 * Both are in Expo Go. The photo is asked for without EXIF and without base64. It is always written again as a JPEG —
 * the file it came in is never sent — and resized from its own rendered size (the picker's may be 0). The size reported
 * is the saved file's: what photo.ts checks before anything leaves the phone (V1). Both files are the app's own copies
 * in its cache (the picker copies the chosen photo; the library's original is never touched), deleted after the read.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitWithin, type PhotoCache, type PhotoTools } from './photo';

export const photoTools: PhotoTools = {
  async pick(source) {
    // The library is the system's picker (no permission on iOS 14+); the camera asks once.
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return 'denied';
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    return asset === undefined ? null : { uri: asset.uri };
  },

  async shrink(uri, maxSide, quality) {
    let image = await ImageManipulator.manipulate(uri).renderAsync();
    const size = fitWithin(image.width, image.height, maxSide);
    if (size !== null) {
      const resizing = ImageManipulator.manipulate(image);
      resizing.resize(size);
      image = await resizing.renderAsync();
    }
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true });
    if (saved.base64 === undefined) throw new Error('no base64');
    return { base64: saved.base64, width: saved.width, height: saved.height, uri: saved.uri };
  },

  async discard(uri) {
    // Only a copy in this app's cache: a picker that ever handed back the library's own file (an Android content://, a
    // document) would otherwise lose the user's photo.
    const cache = Paths.cache.uri.endsWith('/') ? Paths.cache.uri : `${Paths.cache.uri}/`;
    if (!uri.startsWith(cache)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  },
};

/**
 * The folders the two native modules write to, as their installed iOS code names them (SDK 57: expo-image-picker
 * MediaHandler.generateUrl, `ImagePicker`; expo-image-manipulator ImageManipulatorUtils, `ImageManipulator`, both under the
 * caches directory). The picker's name is joined by an expression that leaves it out when the caches path ends in "/",
 * then its files sit in the cache's root — which is why every read deletes its own files (readMealPhoto) and this is the
 * second line, for a read cut short.
 */
const CACHE_FOLDERS = ['ImagePicker', 'ImageManipulator'];

export const devicePhotoCache: PhotoCache = {
  async clear() {
    // Each folder tried, one failing or not; the first failure told after.
    let failure: unknown = null;
    for (const name of CACHE_FOLDERS) {
      try {
        const folder = new Directory(Paths.cache, name);
        if (folder.exists) folder.delete();
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure !== null) throw failure;
  },
};
