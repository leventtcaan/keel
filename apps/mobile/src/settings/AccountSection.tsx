import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { billsOn } from '@/subscription/status';
import { load } from '@/today/today';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Confirm } from './Confirm';
import { Section } from './Section';
import { useAction } from './useAction';

type Subscription = components['schemas']['Subscription'];
/** Deleting: the subscription as the server keeps it, or 'unknown' when it could not be read. */
type Asking = null | { deleting: Subscription | 'unknown' } | { pending: number; photos: boolean };

/**
 * The account: export (K-214, a JSON file), delete (App Review 5.1.1(v): in the app; asks first — and, while Apple would
 * go on charging a subscription or the phone cannot tell, says so and offers Apple's page first, K-811), sign out (warns when
 * entries have not reached the server: a sign-out drops them, K-304; and when progress photos are on the phone: they are
 * only there, and go with the account, K-614). The rows are neutral; the warn colour is only on
 * a confirming step (ADR-016).
 */
export function AccountSection() {
  const { api, purchases, exportData, deleteAccount, signOut, pendingCount, photos } = useAppServices();
  const { color } = useTheme();
  const [asking, setAsking] = useState<Asking>(null);
  const { busy, problem, run } = useAction();

  const exportAll = () => void run(exportData, { NoConnection: 'settings.export.failed' });
  const remove = () => void run(deleteAccount, { NoConnection: 'settings.delete.failed' });
  // Counting what is waiting is part of the action: if the phone cannot tell, it does not sign out blind.
  const leave = () =>
    void run(async () => {
      const [pending, kept] = await Promise.all([pendingCount(), photos.photos()]);
      if (pending > 0 || kept.length > 0) setAsking({ pending, photos: kept.length > 0 });
      else await signOut();
    }, {});

  // Read when asked, not before: a subscription bought a minute ago counts. Not read is not "none" (Apple's guidance).
  const askToDelete = () =>
    void run(async () => {
      const read = await load(() => api.GET('/v1/subscription'));
      setAsking({ deleting: read.state === 'ready' ? read.value : 'unknown' });
    }, {});
  const deleting = asking !== null && 'deleting' in asking ? asking.deleting : null;
  const billed = deleting === 'unknown' || (deleting !== null && billsOn(deleting));
  const manage = (subscription: Subscription) =>
    void run(
      async () => {
        await purchases.identify(subscription.appUserId);
        await purchases.manage();
      },
      {},
      'settings.subscription.manageFailed',
    );
  const manageButton =
    deleting !== null && deleting !== 'unknown' && billsOn(deleting) && purchases.available ? (
      <Button label={t('settings.subscription.manage')} variant="ghost" size="sm" disabled={busy} onPress={() => manage(deleting)} />
    ) : undefined;
  const deleteQuestion =
    deleting !== null ? (
      <Confirm
        title={t('settings.delete.confirmTitle')}
        body={[t('settings.delete.confirmBody'), ...(billed ? [t('settings.delete.subscription')] : [])]}
        confirmLabel={t('settings.delete.confirm')}
        keepLabel={t('settings.delete.keep')}
        onConfirm={remove}
        onKeep={() => setAsking(null)}
        busy={busy}
        aside={manageButton}
      />
    ) : null;
  const signOutQuestion =
    asking !== null && !('deleting' in asking) ? (
      <Confirm
        body={[
          ...(asking.pending > 0 ? [t('settings.signOut.pending', { count: asking.pending })] : []),
          ...(asking.photos ? [t('settings.signOut.photos')] : []),
        ]}
        confirmLabel={t('settings.signOut.confirm')}
        keepLabel={t('settings.signOut.keep')}
        onConfirm={() => void run(signOut, {})}
        onKeep={() => setAsking(null)}
        busy={busy}
      />
    ) : null;

  return (
    <Section title={t('settings.account.title')}>
      <View style={styles.item}>
        <Button label={t('settings.export.title')} variant="ghost" onPress={exportAll} disabled={busy} />
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.export.note')}</Text>
      </View>
      <View style={styles.item}>
        <Button label={t('settings.delete.title')} variant="ghost" onPress={askToDelete} disabled={busy} />
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.delete.note')}</Text>
      </View>
      {deleteQuestion}
      <Button label={t('settings.signOut.title')} variant="ghost" onPress={leave} disabled={busy} />
      {signOutQuestion}
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
    </Section>
  );
}

const styles = StyleSheet.create({
  item: { gap: tokens.space.xs },
  note: { fontSize: tokens.type.bodySmall },
  text: { fontSize: tokens.type.body },
});
