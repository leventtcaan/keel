/**
 * Barlow Condensed weights the app uses, registered under the names in tokens.font (ADR-070 #5: headings and large
 * numbers only; body text is the system font). Loaded at runtime so Expo Go and development builds behave the same.
 * Subpath imports bundle only these three files, not the whole family.
 */
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';

import { tokens } from './tokens';

export const fontAssets = {
  [tokens.font.display]: BarlowCondensed_900Black,
  [tokens.font.displayBold]: BarlowCondensed_700Bold,
  [tokens.font.displaySemiBold]: BarlowCondensed_600SemiBold,
};
