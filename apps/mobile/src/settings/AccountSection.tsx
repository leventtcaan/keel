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

type Asking = null | 'delete' | { pending: number };

/**
 * The account: export (K-214, a JSON file), delete (App Review 5.1.1(v): in the app; asks first), sign out (warns when
 * entries have not reached the server: a sign-out drops them, K-304). The rows are neutral; the warn colour is only on
 * a confirming step (ADR-016).
 */
export function AccountSection() {
  const { exportData, deleteAccount, signOut, pendingCount } = useAppServices();
  const { color } = useTheme();
  const [asking, setAsking] = useState<Asking>(null);
  const { busy, problem, run } = useAction();

  const exportAll = () => void run(exportData, { NoConnection: 'settings.export.failed' });
  const remove = () => void run(deleteAccount, { NoConnection: 'settings.delete.failed' });
  const leave = async () => {
    const pending = await pendingCount();
    if (pending > 0) setAsking({ pending });
    else void run(signOut, {});
  };

  const question =
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
    ) : asking !== null ? (
      <Confirm
        body={t('settings.signOut.pending', { count: asking.pending })}
        confirmLabel={t('settings.signOut.confirm')}
        keepLabel={t('settings.signOut.keep')}
        onConfirm={() => void run(signOut, {})}
        onKeep={() => setAsking(null)}
        busy={busy}
      />
    ) : null;

  return (
    <Section title={t('settings.export.title')}>
      <View style={styles.item}>
        <Button label={t('settings.export.title')} variant="ghost" onPress={exportAll} disabled={busy} />
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.export.note')}</Text>
      </View>
      <View style={styles.item}>
        <Button label={t('settings.delete.title')} variant="ghost" onPress={() => setAsking('delete')} disabled={busy} />
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.delete.note')}</Text>
      </View>
      <Button label={t('settings.signOut.title')} variant="ghost" onPress={() => void leave()} disabled={busy} />
      {question}
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
    </Section>
  );
}

const styles = StyleSheet.create({
  item: { gap: tokens.space.xs },
  note: { fontSize: tokens.type.bodySmall },
  text: { fontSize: tokens.type.body },
});
