import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Confirm } from './Confirm';
import { Section } from './Section';
import { useAction } from './useAction';

type Asking = null | 'delete' | { pending: number; photos: boolean };

/**
 * The account: export (K-214, a JSON file), delete (App Review 5.1.1(v): in the app; asks first), sign out (warns when
 * entries have not reached the server: a sign-out drops them, K-304; and when progress photos are on the phone: they are
 * only there, and go with the account, K-614). The rows are neutral; the warn colour is only on
 * a confirming step (ADR-016).
 */
export function AccountSection() {
  const { exportData, deleteAccount, signOut, pendingCount, photos } = useAppServices();
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

  const deleteQuestion =
    asking === 'delete' ? (
      <Confirm
        title={t('settings.delete.confirmTitle')}
        body={t('settings.delete.confirmBody')}
        confirmLabel={t('settings.delete.confirm')}
        keepLabel={t('settings.delete.keep')}
        onConfirm={remove}
        onKeep={() => setAsking(null)}
        busy={busy}
      />
    ) : null;
  const signOutQuestion =
    asking !== null && asking !== 'delete' ? (
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
        <Button label={t('settings.delete.title')} variant="ghost" onPress={() => setAsking('delete')} disabled={busy} />
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
