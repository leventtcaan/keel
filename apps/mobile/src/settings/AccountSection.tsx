import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { billsOn } from '@/subscription/status';
import { load } from '@/today/today';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { askFirst } from './askFirst';
import { Section } from './Section';
import { useAction } from './useAction';

/**
 * The account: export (K-214, a JSON file), delete (App Review 5.1.1(v): in the app; asks first — and, while Apple would
 * go on charging a subscription or the phone cannot tell, says so, K-811), sign out (warns when entries have not reached the
 * server: a sign-out drops them, K-304; and when progress photos are on the phone: they are only there, and go with the
 * account, K-614). The questions are system alerts, on the screen wherever the list is scrolled (ADR-087 #1); "Cancel or change
 * plan" stays in Settings' subscription section. The rows are neutral.
 */
export function AccountSection() {
  const { api, exportData, deleteAccount, signOut, pendingCount, photos } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();

  const exportAll = () => void run(exportData, { NoConnection: 'settings.export.failed' });
  const remove = () => void run(deleteAccount, { NoConnection: 'settings.delete.failed' });
  // Counting what is waiting is part of the action: if the phone cannot tell, it does not sign out blind.
  const leave = () =>
    void run(async () => {
      const [pending, kept] = await Promise.all([pendingCount(), photos.photos()]);
      if (pending === 0 && kept.length === 0) return signOut();
      askFirst({
        title: t('settings.signOut.confirmTitle'),
        body: [...(pending > 0 ? [t('settings.signOut.pending', { count: pending })] : []), ...(kept.length > 0 ? [t('settings.signOut.photos')] : [])],
        confirmLabel: t('settings.signOut.confirm'),
        keepLabel: t('settings.signOut.keep'),
        onConfirm: () => void run(signOut, {}),
      });
    }, {});

  // Read when asked, not when Settings opened: the latest the server knows. Not read is not "none" (Apple's guidance).
  const askToDelete = () =>
    void run(async () => {
      const read = await load(() => api.GET('/v1/subscription'));
      const billed = read.state !== 'ready' || billsOn(read.value);
      askFirst({
        title: t('settings.delete.confirmTitle'),
        body: [t('settings.delete.confirmBody'), ...(billed ? [t('settings.delete.subscription')] : [])],
        confirmLabel: t('settings.delete.confirm'),
        keepLabel: t('settings.delete.keep'),
        onConfirm: remove,
      });
    }, {});

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
      <Button label={t('settings.signOut.title')} variant="ghost" onPress={leave} disabled={busy} />
      {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  item: { gap: tokens.space.xs },
  note: { fontSize: tokens.type.bodySmall },
  text: { fontSize: tokens.type.body },
});
