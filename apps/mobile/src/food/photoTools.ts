/**
 * The native side of a meal photo (K-408): the system's camera or photo picker (expo-image-picker) and the shrinking
 * (expo-image-manipulator, SDK 57 — `manipulate → resize → renderAsync → saveAsync`, checked against the installed types).
 * Both are in Expo Go. The photo is asked for without EXIF and without base64 — only the shrunk JPEG is read as base64.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { PhotoTools } from './photo';

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
    return asset === undefined ? null : { uri: asset.uri, width: asset.width, height: asset.height };
  },

  async shrink(uri, size, quality) {
    const context = ImageManipulator.manipulate(uri);
    if (size !== null) context.resize(size);
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true });
    if (saved.base64 === undefined) throw new Error('no base64');
    return { base64: saved.base64, width: saved.width, height: saved.height };
  },
};
