import { activeLocale } from '@/copy/locales';

/** The server's Turkish household measures (K-1213): "tr:su-bardagi", "tr:yemek-kasigi", "tr:corba-kepcesi". */
export const TURKISH_MEASURE = 'tr:';
export const isTurkishMeasure = (unit: string): boolean => unit.startsWith(TURKISH_MEASURE);

/** Whether a portion is one this phone shows: the Turkish measures only while Turkish is showing. */
export const isOffered = (unit: string): boolean => !isTurkishMeasure(unit) || activeLocale() === 'tr';
