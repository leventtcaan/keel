import { ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { dayWords } from '@/subscription/words';
import { useTrialReminder } from '@/subscription/TrialReminderOffer';

/**
 * The free trial's reminder as a row of Settings › Reminders (K-1062; it was under Subscription, so the reminders were in two
 * places). During a trial, "Remind me before it ends": iOS is asked on the tap, and once set the row says the day it comes.
 * Not a trial, or too late for one: no row. The state is the paywall offer's own (`useTrialReminder`).
 */
export function TrialReminderRow() {
  const { offered, at, note, busy, ask } = useTrialReminder();
  if (!offered) return null;
  if (at !== null) return <ListRow icon="hourglass" label={t('settings.reminders.trial')} value={dayWords(at)} />;
  return (
    <ListRow
      icon="hourglass"
      label={t('subscription.reminder.ask')}
      detail={note === null ? undefined : t(`subscription.reminder.${note}`)}
      disabled={busy}
      navigates
      testID="trial-reminder-row"
      onPress={() => void ask()}
    />
  );
}
