/**
 * Barlow Condensed weights the app uses, registered under the names in tokens.font (ADR-016: headings and large
 * numbers only; body text is the system font). Loaded at runtime so Expo Go and development builds behave the same.
 * Subpath imports bundle only these three files, not the whole family.
 */
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';

import { tokens } from './tokens';

export const fontAssets = {
  [tokens.font.display]: BarlowCondensed_800ExtraBold,
  [tokens.font.displayBold]: BarlowCondensed_700Bold,
  [tokens.font.displaySemiBold]: BarlowCondensed_600SemiBold,
};
