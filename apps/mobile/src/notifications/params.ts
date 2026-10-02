/** The reminders' timing, from data/parameters/notifications.json (ADR-029: parameters the phone reads; K-410). */
import params from '../../../../data/parameters/notifications.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`notifications.json has no ${key}`);
  return found.value as T;
}

export const notificationParams = {
  trainingLeadMinutes: param<number>('training_reminder_lead_minutes'),
  checkInTime: param<string>('check_in_reminder_time'),
  quietDays: param<number>('quiet_days'),
  cueMaxChars: param<number>('cue_max_chars'),
};
