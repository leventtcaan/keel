import { activeLocale } from '@/copy/locales';

/** The server's Turkish household measures (K-1213): "tr:su-bardagi", "tr:yemek-kasigi", "tr:corba-kepcesi". */
export const TURKISH_MEASURE = 'tr:';
export const isTurkishMeasure = (unit: string): boolean => unit.startsWith(TURKISH_MEASURE);

/** Whether a portion is one this phone shows: the Turkish measures only while Turkish is showing. */
export const isOffered = (unit: string): boolean => !isTurkishMeasure(unit) || activeLocale() === 'tr';

/** Ounces are no measure in Turkish kitchens: while Turkish is showing the portion step offers grams and the household measures (ADR-094 Ek 4 #6). */
export const OUNCE = 'oz';
export const isShownUnit = (unit: string): boolean => unit !== OUNCE || activeLocale() !== 'tr';
