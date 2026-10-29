import { router } from 'expo-router';

import { t } from '@/copy';

/**
 * The pages one level under Settings (ADR-070 Ek 2 #2: a long explanation, an editor or a consent text goes to a page of its
 * own, never under a row). One route, `settings-detail`, shows the part named in its `part` parameter; the title of each
 * is the label of the row that opens it.
 */
export const DETAIL_PARTS = {
  food: 'settings.food.avoid',
  routine: 'settings.reminders.routine',
  consent: 'settings.health.consent',
  apple: 'settings.consents.APPLE_HEALTH',
  write: 'settings.healthWrite.title',
  import: 'settings.import.title',
  sources: 'settings.sources.title',
} as const;

export type DetailPart = keyof typeof DETAIL_PARTS;

export const isDetailPart = (value: unknown): value is DetailPart => typeof value === 'string' && Object.hasOwn(DETAIL_PARTS, value);

export const detailTitle = (part: DetailPart): string => t(DETAIL_PARTS[part]);

export const openDetail = (part: DetailPart) => router.push({ pathname: '/settings-detail', params: { part } });
