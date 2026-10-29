/** The words of the profile's answers, as Settings says them: the same as onboarding's (copy `onboarding.*`), so one answer has one name. */
import type { components } from '@/api/schema';
import { t } from '@/copy';

type Schemas = components['schemas'];

const GOALS = { LOSE_FAT: 'lose_fat', BUILD_MUSCLE: 'build_muscle', DECIDE_FOR_ME: 'decide_for_me' } as const satisfies Record<Schemas['Profile']['goal'], string>;

export const GOAL_VALUES: readonly Schemas['Profile']['goal'][] = ['DECIDE_FOR_ME', 'LOSE_FAT', 'BUILD_MUSCLE'];
export const ACTIVITY_VALUES: readonly Schemas['ActivityLevel'][] = ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE'];
export const DAY_VALUES: readonly Schemas['Weekday'][] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const goalName = (goal: Schemas['Profile']['goal']): string => t(`onboarding.goal.${GOALS[goal]}.title`);
export const dayName = (day: Schemas['Weekday']): string => t(`onboarding.schedule.dayName.${day}`);
/** A profile made before the question was asked has no level: "Not set", never a guess. */
export const activityName = (level: Schemas['ActivityLevel'] | undefined): string =>
  level === undefined ? t('settings.profile.notSet') : t(`onboarding.activity.${level}`);
