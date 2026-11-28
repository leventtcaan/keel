import { router } from 'expo-router';

import { t } from '@/copy';

/**
 * The chapters of Settings (K-1257, ADR-094 Ek 9): Settings is their contents, one row each, and each is a page of its own
 * (`settings-section`). The order is the screen's: what the call reads first, the app and the account last.
 */
export const SECTIONS = ['week', 'you', 'reminders', 'health', 'coach', 'subscription', 'app', 'about', 'account'] as const;

export type SectionId = (typeof SECTIONS)[number];

/** A chapter's name: the group's own where Settings had one, a new one for the chapters that bring groups together. */
const TITLES: Record<SectionId, string> = {
  week: 'settings.section.week',
  you: 'settings.section.you',
  reminders: 'settings.reminders.title',
  health: 'settings.health.title',
  coach: 'settings.coach.title',
  subscription: 'settings.subscription.title',
  app: 'settings.section.app',
  about: 'settings.section.about',
  account: 'settings.account.title',
};

export const isSection = (value: unknown): value is SectionId => typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);

export const sectionTitle = (section: SectionId): string => t(TITLES[section]);

export const openSection = (section: SectionId) => router.push({ pathname: '/settings-section', params: { section } });
