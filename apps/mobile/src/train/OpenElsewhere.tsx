import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Continued, continueOpen, discardOpen } from './openSession';
import { workoutParams } from './params';

type Props = {
  /** The server's id of the open workout (`WeekSession.workout.id`). */
  workoutId: string;
  /** The server's word on the week may have changed (it ended, was discarded): the screen reads it again. */
  onChanged: () => void;
};

const SAID: Record<Exclude<Continued['kind'], 'opened'>, string> = {
  offline: 'openElsewhere.offline',
  failed: 'openElsewhere.failed',
  closed: 'openElsewhere.closed',
  gone: 'openElsewhere.gone',
};

/**
 * The way back into a session the server has open that this phone does not (K-999, ADR-075 #5): on the card that says so,
 * on the Train tab and This week. Continue reads the workout from the server and the session opens on its sets, then the
 * phone carries on as with any other (openSession.ts). Fill in later leaves it open as it is (it counts, and the server
 * closes it by itself, K-961). Discard asks once more, then deletes it on the server (K-998). A failure is said on the card,
 * and the same button tries again. One at a time: a second tap in the same moment must not start a second read.
 */
export function OpenElsewhere({ workoutId, onChanged }: Props) {
  const { api, adoptWorkout } = useAppServices();
  const { color } = useTheme();
  const [step, setStep] = useState<'choose' | 'ask' | 'left'>('choose');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [problem, setProblem, occurrence] = useProblem();

  /** One action at a time; the buttons rest while it runs. */
  const run = async (action: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const goOn = () =>
    run(async () => {
      const answer = await continueOpen({ api, adopt: adoptWorkout }, workoutId);
      if (answer.kind === 'opened') {
        setProblem(null);
        router.push('/workout');
        return;
      }
      setProblem(t(SAID[answer.kind]));
      // Ended or discarded meanwhile: the card is not the server's word any more.
      if (answer.kind === 'closed' || answer.kind === 'gone') onChanged();
    });

  const discard = () =>
    run(async () => {
      const answer = await discardOpen(api, workoutId);
      if (answer.kind === 'closed') {
        // Ended meanwhile (the card is from before): nothing deleted, the week is read again.
        setProblem(t(SAID.closed));
        onChanged();
        return;
      }
      if (answer.kind !== 'done') {
        setProblem(t(answer.kind === 'offline' ? 'openElsewhere.discardOffline' : 'workout.ending.failed'));
        return;
      }
      setProblem(null);
      announce(t('openElsewhere.discarded'));
      onChanged();
    });

  const later = () => {
    setStep('left');
    setProblem(null);
    announce(t('openElsewhere.laterSaid', { hours: workoutParams.unfinishedSessionCloseHours }));
  };
  const ask = () => {
    setStep('ask');
    setProblem(null);
    // The buttons under the finger are replaced by the question: said, not only shown.
    announce(t('workout.ending.discardAsk'));
  };

  const hours = workoutParams.unfinishedSessionCloseHours;
  const left = step === 'left';
  const choose = step === 'choose';
  const asked = step === 'ask';
  const keep = <Button label={t('workout.ending.keep')} variant="ghost" size="touch" onPress={() => setStep('choose')} disabled={busy} />;
  // Built apart from the return: the choice is one of three faces of the same place.
  const asking = (
    <>
      <Text style={[styles.text, styles.bold, { color: color.text }]}>{t('workout.ending.discardAsk')}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.ending.discardNote')}</Text>
      <View style={styles.row}>
        <Button label={t('workout.ending.confirm')} variant="warn" size="touch" onPress={() => void discard()} disabled={busy} />
        {keep}
      </View>
    </>
  );
  const laterButton = (
    <Button label={t('openElsewhere.later')} accessibilityLabel={t('openElsewhere.laterLabel')} variant="ghost" size="touch" onPress={later} disabled={busy} />
  );
  const laterNote = <Text style={[styles.small, { color: color.textSecondary }]}>{t('openElsewhere.laterSaid', { hours })}</Text>;
  const choosing = (
    <>
      {left ? laterNote : null}
      <View style={styles.row}>
        <Button label={t('openElsewhere.continue')} accessibilityLabel={t('openElsewhere.continueLabel')} size="touch" onPress={() => void goOn()} disabled={busy} />
        {choose ? laterButton : null}
        <Button label={t('openElsewhere.discard')} accessibilityLabel={t('openElsewhere.discardLabel')} variant="ghost" size="touch" onPress={ask} disabled={busy} />
      </View>
    </>
  );
  const said =
    problem === null ? null : (
      <ProblemText occurrence={occurrence} style={[styles.small, { color: color.text }]}>
        {problem}
      </ProblemText>
    );
  return (
    <View testID="open-elsewhere" style={styles.box}>
      {asked ? asking : choosing}
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: tokens.space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
