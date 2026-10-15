/**
 * The program in one line each, as Edit program (K-970) and Settings (K-982) say it: the days by their own weekdays (the one
 * source, `Program.days[].weekday`) and the week's cardio as the server planned it. Said here once so both screens agree.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

type Program = components['schemas']['Program'];

/** "Mon · Wed · Fri": each day's weekday, "Any day" for one that has none. */
export function daysLine(program: Program): string {
  return program.days
    .map((day) => (day.weekday === undefined ? t('editProgram.anyDay') : t(`programEditor.weekdayShort.${day.weekday}`)))
    .join(t('editProgram.dayList'));
}

/** The week's cardio as the server set it: "2 × 30 min", or off (none, or turned off). */
export function cardioLine(program: Program): string {
  const cardio = program.cardio;
  if (cardio === undefined || cardio.sessionsPerWeek === 0) return t('editProgram.cardio.off');
  return t('editProgram.cardio.row', { sessions: cardio.sessionsPerWeek, minutes: cardio.minutes });
}
