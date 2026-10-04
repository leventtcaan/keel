import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { load } from '@/today/today';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { dayWords } from './words';

type Subscription = components['schemas']['Subscription'];
type Shown = { subscription: Subscription; at: Date | null };
type Note = 'refused' | 'failed' | null;

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * The trial reminder's offer (K-707, ADR-058 › 105): during a trial, "Remind me before it ends" — iOS is asked on this tap, the
 * reminder set; once set, the day it comes. Not a trial (or too late for one): nothing. Given the subscription (Settings) or
 * reading it (the paywall's "you're subscribed" step, which knows only that access is on). Each read lets a reminder asked for
 * follow the trial (`keep`).
 */
export function TrialReminderOffer({ subscription }: { subscription?: Subscription }) {
  const { api, trialReminder, report } = useAppServices();
  const { color } = useTheme();
  const [shown, setShown] = useState<Shown | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const read = subscription === undefined ? load(() => api.GET('/v1/subscription')) : Promise.resolve({ state: 'ready' as const, value: subscription });
    void read
      .then(async (loaded) => {
        if (loaded.state !== 'ready') return null;
        await trialReminder.keep(loaded.value);
        return { subscription: loaded.value, at: await trialReminder.when() };
      })
      .then(
        (now) => live && setShown(now),
        (error: unknown) => report({ name: nameOf(error) }),
      );
    return () => {
      live = false;
    };
  }, [api, report, subscription, trialReminder]);

  if (shown === null || shown.subscription.status !== 'TRIAL') return null;
  // Too late for one (the trial ends sooner than it would come), and none set: no offer that would do nothing.
  if (shown.at === null && !trialReminder.canRemind(shown.subscription)) return null;
  const words = (key: string, tone: 'text' | 'muted' = 'text', values?: Record<string, string>) => (
    <Text style={[styles.note, { color: color[tone] }]}>{t(key, values)}</Text>
  );
  if (shown.at !== null) return words('subscription.reminder.set', 'muted', { date: dayWords(shown.at) });

  const ask = async () => {
    setBusy(true);
    setNote(null);
    try {
      const outcome = await trialReminder.remind(shown.subscription);
      if (outcome === 'set') setShown({ ...shown, at: await trialReminder.when() });
      else setNote(outcome === 'refused' ? 'refused' : null);
    } catch (error) {
      report({ name: nameOf(error) });
      setNote('failed');
    } finally {
      setBusy(false);
    }
  };
  const button = <Button label={t('subscription.reminder.ask')} variant="ghost" size="sm" disabled={busy} onPress={() => void ask()} />;
  const said = note === null ? null : words(`subscription.reminder.${note}`);
  return (
    <View style={styles.offer}>
      {button}
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { gap: tokens.space.xs },
  note: { fontSize: tokens.type.bodySmall },
});
