import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { configuredLegalLinks } from '@/subscription/links';
import { trialOnOffer } from '@/subscription/paywall';
import type { Plan } from '@/subscription/store';
import { span } from '@/subscription/words';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type LockedCall, weekdayDate } from './today';

/**
 * The free trial this person can still have, as the store says it (ADR-091 Ek 7 #2), asked each time the screen comes into
 * focus (a trial used meanwhile, a first read that failed offline); none while it is first asked and none when it cannot be
 * read: the card then says what it always said, never a trial the paywall would not offer (Apple 3.1.2).
 */
function useTrialOnOffer(): Plan['trial'] {
  const { api, purchases } = useAppServices();
  const [trial, setTrial] = useState<Plan['trial']>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void trialOnOffer({ api, store: purchases, links: configuredLegalLinks() })
        .catch(() => null)
        .then((found) => {
          if (live) setTrial(found);
        });
      return () => {
        live = false;
      };
    }, [api, purchases]),
  );
  return trial;
}

/**
 * A weekly call the account has not unlocked (ADR-091 Ek 1, K-1202): that it is ready, for which week, and the one way to the
 * plans. Nothing of what it says (no action, no numbers, no reasons) and no tone of loss (U7). The same block is the hero on
 * This week and the whole of the call screen, so the two cannot say it differently. Where the store gives this person a free
 * trial, the card says it, the store's length on the button (ADR-091 Ek 7: the trial is offered here, where the first paid
 * call is); the purchase and its terms stay the paywall's (Apple 3.1.2).
 */
export function LockedCallView({ call, testID = 'locked-call' }: { call: LockedCall; testID?: string }) {
  const { color } = useTheme();
  const trial = useTrialOnOffer();
  const date = weekdayDate(call.weekOf);
  const words = trial === null ? t('lockedCall.line', { date }) : t('lockedCall.lineTrial', { date });
  const line = <Text style={[styles.line, { color: color.decisionTextSecondary }]}>{words}</Text>;
  const label = trial === null ? t('subscription.seePlans') : t('lockedCall.tryFree', { trial: span(trial) });
  // The plans open on this call's week: the paywall shows the person their own call (ADR-094 Ek 8 #2).
  const plans = <Button label={label} onPress={() => router.push({ pathname: '/paywall', params: { week: call.weekOf } })} />;
  return (
    <DecisionBlock testID={testID} title={t('lockedCall.title')} footer={plans}>
      {line}
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({ line: { fontSize: tokens.type.body } });
