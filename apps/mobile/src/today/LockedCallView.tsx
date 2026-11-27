import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type LockedCall, weekdayDate } from './today';

/**
 * A weekly call the account has not unlocked (ADR-091 Ek 1, K-1202): that it is ready, for which week, and the one way to the
 * plans. Nothing of what it says (no action, no numbers, no reasons) and no tone of loss (U7). The same block is the hero on
 * This week and the whole of the call screen, so the two cannot say it differently.
 */
export function LockedCallView({ call, testID = 'locked-call' }: { call: LockedCall; testID?: string }) {
  const { color } = useTheme();
  const line = <Text style={[styles.line, { color: color.decisionTextSecondary }]}>{t('lockedCall.line', { date: weekdayDate(call.weekOf) })}</Text>;
  // The plans open on this call's week: the paywall shows the person their own call (ADR-094 Ek 8 #2).
  const plans = <Button label={t('subscription.seePlans')} onPress={() => router.push({ pathname: '/paywall', params: { week: call.weekOf } })} />;
  return (
    <DecisionBlock testID={testID} title={t('lockedCall.title')} footer={plans}>
      {line}
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({ line: { fontSize: tokens.type.body } });
