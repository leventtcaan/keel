/**
 * Apple Maps for the saved places (K-1227, ADR-093): MKLocalSearch (an address to a name and a point) and MKDirections on foot
 * (the metres between two points), in ios/PlacesModule.swift. Our own local module (ADR-047's way: a thin Expo module, no package).
 * No location is read and no permission asked. Only in our own build; Expo Go does not carry it, and there this is null.
 */
import { requireOptionalNativeModule } from 'expo';

export type FoundPlace = { name: string; address: string; lat: number; lng: number };

export type Places = {
  /** Up to five matches for the text; empty when none; rejects when the search fails (offline, say). */
  search(text: string): Promise<FoundPlace[]>;
  /** Metres on foot between two points; null when Apple has no walking route; rejects when the request fails. */
  walkingDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number | null>;
};

export const placesModule = (): Places | null => requireOptionalNativeModule<Places>('Places');
