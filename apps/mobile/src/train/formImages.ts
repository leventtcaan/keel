import type { ImageSourcePropType } from 'react-native';

/**
 * The drawn form images in the app's assets (ADR-091 #4, K-1219): the server names one by its asset path
 * (`Exercise.image`, only once the image passed its review), and Metro needs a static `require` for each file, so the
 * paths map to them here. A move gets a line here when its image file is added (the form-images test keeps the map and
 * the assets folder the same).
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  'exercises/lat_pulldown/form.webp': require('../../assets/exercises/lat_pulldown/form.webp'),
  'exercises/romanian_deadlift/form.webp': require('../../assets/exercises/romanian_deadlift/form.webp'),
  'exercises/squat/form.webp': require('../../assets/exercises/squat/form.webp'),
};

/** The image a path from the server names; nothing when this build has no such file (an older app, a newer catalog). */
export function formImage(path: string | undefined): ImageSourcePropType | undefined {
  return path === undefined ? undefined : IMAGES[path];
}

/** The paths this build has a file for. */
export const formImagePaths = Object.keys(IMAGES);
