import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Language } from '@/copy/locales';
import type { Appearance } from '@/theme/appearance';
import type { Loaded } from '@/today/today';
import { cardioLine, daysLine } from '@/train/programLines';
import { formatHeight, type UnitSystem } from '@/units/units';

import { dayName, goalName } from './profileWords';
import type { SectionId } from './sections';
import { stateWords } from './SubscriptionSection';

type Schemas = components['schemas'];

/** What the contents page knows: the three reads it makes, whether reminders ring (null until iOS answers), and the phone's choices. */
export type ContentsFacts = {
  program?: Loaded<Schemas['Program']>;
  profile?: Loaded<Schemas['Profile']>;
  subscription?: Loaded<Schemas['Subscription']>;
  remindersOn: boolean | null;
  appearance: Appearance;
  language: Language;
  units: UnitSystem;
};

const joined = (parts: (string | undefined)[]) => parts.filter((part): part is string => part !== undefined && part !== '').join(t('editProgram.listJoin'));

/**
 * The line under each chapter (K-1257, ADR-094 Ek 9): what it holds today, from what the page has already read; a chapter whose
 * values are not read here (consents, the coach, the about rows, the account's actions) names what it holds instead. A value
 * still on its way, or one that could not be read, is left out: the chapter's own page says why.
 */
export function contentsLines(facts: ContentsFacts): Record<SectionId, string> {
  const program = facts.program?.state === 'ready' ? facts.program.value : undefined;
  const profile = facts.profile?.state === 'ready' ? facts.profile.value : undefined;
  const subscription = facts.subscription?.state === 'ready' ? facts.subscription.value : undefined;
  return {
    week: joined([
      program && daysLine(program),
      profile && t('settings.section.checkIn', { day: dayName(profile.schedule.checkInDay) }),
      program && cardioLine(program),
    ]),
    you: joined([profile && goalName(profile.goal), profile && formatHeight(profile.heightCm, facts.units), profile && String(profile.birthYear)]),
    reminders: facts.remindersOn === null ? '' : t(facts.remindersOn ? 'settings.section.on' : 'settings.section.off'),
    health: t('settings.section.healthLine'),
    coach: t('settings.section.coachLine'),
    subscription: subscription === undefined ? '' : stateWords(subscription),
    app: joined([
      t(`settings.appearance.${facts.appearance}`),
      t(`settings.language.${facts.language}`),
      t(facts.units === 'METRIC' ? 'settings.units.metricShort' : 'settings.units.imperialShort'),
    ]),
    about: t('settings.section.aboutLine'),
    account: t('settings.section.accountLine'),
  };
}
