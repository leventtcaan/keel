/**
 * Fonts the app loads at runtime, registered under the names in tokens.font. ADR-094 §2 uses only iOS system designs
 * (the serif and the rounded design), which React Native resolves by name, so there is nothing to load. A family added
 * later that is not a system design is registered here; fonts.test.ts holds the two lists together.
 */
import type { useFonts } from 'expo-font';

/** What useFonts takes as a map of names to font files. */
type FontMap = Exclude<Parameters<typeof useFonts>[0], string>;

export const fontAssets: FontMap = {};
