/**
 * The native side of a meal photo (K-408): the system's camera or photo picker (expo-image-picker) and the shrinking
 * (expo-image-manipulator, SDK 57 — `manipulate → resize → renderAsync → saveAsync`, checked against the installed types).
 * Both are in Expo Go. The photo is asked for without EXIF and without base64. It is always written again as a JPEG —
 * the file it came in is never sent — and resized from its own rendered size (the picker's may be 0). The size reported
 * is the saved file's: what photo.ts checks before anything leaves the phone (V1).
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitWithin, type PhotoTools } from './photo';

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
    return { base64: saved.base64, width: saved.width, height: saved.height };
  },
};
