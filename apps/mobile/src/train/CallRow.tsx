import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { applyCall } from '@/today/call';

type Decision = components['schemas']['Decision'];

// No connection is the user's to fix; a call that is past (409) is said so; anything else is ours (as CallCard).
const SAID: Record<string, string> = { NoConnection: 'today.call.applyFailed', ApplyRefused: 'today.call.applyRefused' };
const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * This week's call on the Train tab (K-970; prototype `#train` call row): its title in the app's words. A call kept from
 * last week ("Keep last week's plan", K-963, DECLINED) says it is not applied and offers the one tap that uses it after
 * all; then the tab reads again. No call yet (the engine's "not yet", U3): no row. The call itself and its reasons are on
 * This week.
 */
export function CallRow({ decision, onChanged }: { decision: Decision; onChanged: () => void }) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const sending = useRef(false);
  const declined = decision.application.state === 'DECLINED';

  const use = async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await applyCall(api, decision.id);
      setFailed(null);
      onChanged();
    } catch (error) {
      setFailed(SAID[nameOf(error)] ?? 'today.call.applyError');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const action = declined ? <Button label={t('train.call.use')} variant="ghost" size="sm" disabled={busy} onPress={() => void use()} /> : null;
  return (
    <View testID="call-row" style={[styles.row, { backgroundColor: color.accentSoft }]}>
      <Text style={[styles.text, { color: color.text }]}>{declined ? t('train.call.notApplied') : t(`${decision.copyKey}.title`)}</Text>
      {action}
      {failed !== null && <ProblemText style={[styles.small, { color: color.text }]}>{t(failed)}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm, minHeight: tokens.size.touch, justifyContent: 'center' },
  text: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
