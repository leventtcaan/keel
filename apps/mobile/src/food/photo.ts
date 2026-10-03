/**
 * A meal photo from the phone (K-408, V1, V2, ADR-046). The AI consent first — without it nothing is taken, let alone
 * sent. Then the photo is shrunk to at most `meal_photo_max_side` a side and written again as a JPEG on the phone
 * (`shrink`: the image manipulator renders the pixels and saves a new file — whether that file keeps EXIF is not in
 * Expo's documentation [doğrulanmadı], so the server writes its own again and the place never reaches the model), checked,
 * and sent. What comes back is the server's draft of the database's foods, grams by eye marked as estimated (U1, U5).
 * Nothing of the photo is kept: the picker's file and the shrunk one are the system's cache.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { ConsentKind } from '@/consent/consents';
import { load } from '@/today/today';

import { foodParams } from './params';

export type PhotoSource = 'camera' | 'library';
export type Picked = { uri: string };
export type Shrunk = { base64: string; width: number; height: number };

/** The camera or the library, and the shrinking — native, so given (photoTools.ts), and faked in tests. */
export interface PhotoTools {
  /** The photo the user took or chose; null when they backed out; 'denied' when the camera is not allowed. */
  pick(source: PhotoSource): Promise<Picked | null | 'denied'>;
  /**
   * The photo written again as a JPEG at `quality`, in base64 — resized when its own rendered size is over `maxSide`
   * (fitWithin; a picker's reported size may be 0) — with the saved file's size.
   */
  shrink(uri: string, maxSide: number, quality: number): Promise<Shrunk>;
}

export type PhotoRead =
  | { state: 'ready'; draft: components['schemas']['MealDraft'] }
  | { state: 'consent' }
  | { state: 'cancelled' }
  | { state: 'denied' }
  | { state: 'failed' };

/**
 * The size that brings the longer side down to exactly `max`, the shape kept — the shorter side rounded down, at least
 * 1 (a sliver of a photo is still a photo); null when the photo is within it already — a photo is never enlarged.
 */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } | null {
  if (width <= max && height <= max) return null;
  const shorter = (side: number, longer: number) => Math.max(1, Math.floor((side * max) / longer));
  return width >= height ? { width: max, height: shorter(height, width) } : { width: shorter(width, height), height: max };
}

export async function readMealPhoto(
  services: { api: ApiClient; consents: { granted(kind: ConsentKind): Promise<boolean> } },
  tools: PhotoTools,
  source: PhotoSource,
): Promise<PhotoRead> {
  // Not known (a failing keychain) is not given.
  const granted = await services.consents.granted('THIRD_PARTY_AI').catch(() => false);
  if (!granted) return { state: 'consent' };
  let shrunk: Shrunk;
  try {
    const picked = await tools.pick(source);
    if (picked === null) return { state: 'cancelled' };
    if (picked === 'denied') return { state: 'denied' };
    shrunk = await tools.shrink(picked.uri, foodParams.photoMaxSide, foodParams.photoQuality);
  } catch {
    return { state: 'failed' };
  }
  // What leaves the phone is checked here, not trusted to the tool (V1).
  if (shrunk.width > foodParams.photoMaxSide || shrunk.height > foodParams.photoMaxSide) return { state: 'failed' };
  const draft = await load(() => services.api.POST('/v1/meals/photo', { body: { image: shrunk.base64 } }));
  if (draft.state === 'consent') return { state: 'consent' };
  return draft.state === 'ready' ? { state: 'ready', draft: draft.value } : { state: 'failed' };
}
