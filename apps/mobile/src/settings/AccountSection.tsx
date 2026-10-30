import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { billsOn } from '@/subscription/status';
import { load } from '@/today/today';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { askFirst } from './askFirst';
import { useAction } from './useAction';

/**
 * The account as one grouped list (ADR-070 Ek 2 #2), the same in Settings and in the paywall's Account sheet: export (K-214,
 * a JSON file), sign out (asks first; warns when entries have not reached the server: a sign-out drops them, K-304; and when progress
 * photos are on the phone: they are only there, and go with the account, K-614) and delete (App Review 5.1.1(v): in the app;
 * asks first — and, while Apple would go on charging a subscription or the phone cannot tell, says so, K-811). Sign out and
 * Delete account are plain rows (red is only inside the system alerts, evre 7 §A); their questions are system alerts, on
 * the screen wherever the list is scrolled (ADR-087 #1), and sign out is always asked, even with nothing at risk. "Cancel or change plan" stays in Settings' subscription group. `title` and `footer` are
 * for the page that wants them: Settings has the title, the sheet the footer.
 */
export function AccountSection({ title, footer }: { title?: string; footer?: string } = {}) {
  const { api, exportData, deleteAccount, signOut, pendingCount, photos } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();

  const exportAll = () => void run(exportData, { NoConnection: 'settings.export.failed' });
  const remove = () => void run(deleteAccount, { NoConnection: 'settings.delete.failed' });
  // Counting what is waiting is part of the action: if the phone cannot tell, it does not sign out blind.
  const leave = () =>
    void run(async () => {
      const [pending, kept] = await Promise.all([pendingCount(), photos.photos()]);
      // Always asked: one tap must not sign a paid account out. Nothing at risk: the short question; else the warnings.
      const atRisk = pending > 0 || kept.length > 0;
      askFirst({
        title: t('settings.signOut.confirmTitle'),
        body: atRisk
          ? [...(pending > 0 ? [t('settings.signOut.pending', { count: pending })] : []), ...(kept.length > 0 ? [t('settings.signOut.photos')] : [])]
          : t('settings.signOut.confirmBody'),
        confirmLabel: atRisk ? t('settings.signOut.confirm') : t('settings.signOut.title'),
        keepLabel: atRisk ? t('settings.signOut.keep') : t('settings.signOut.cancel'),
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
    <View style={styles.stack}>
      <ListGroup title={title} footer={footer} testID="group-account">
        <ListRow icon="square.and.arrow.up" label={t('settings.export.title')} accessibilityHint={t('settings.export.note')} disabled={busy} onPress={exportAll} />
        <ListRow icon="rectangle.portrait.and.arrow.right" label={t('settings.signOut.title')} disabled={busy} onPress={leave} />
        <ListRow icon="trash" label={t('settings.delete.title')} accessibilityHint={t('settings.delete.note')} disabled={busy} onPress={askToDelete} />
      </ListGroup>
      {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
