import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The health data consent (K-312, ADR-007, GDPR Art. 9): its own screen, before the first health question, with the
 * text whose version is recorded. "Allow" records it on the server before moving on; "Not now" asks nothing health
 * later in the walk (weight, waist, foods to avoid). Once allowed it can be taken back right here (Art. 7(3)): withdrawn
 * on the server, and the health answers typed so far leave the draft with it. While an answer is on its way, the other
 * choice and the way back are off, so the last choice made is the one recorded.
 */
export default function HealthDataStep() {
  const { draft, update } = useDraft();
  const { api, report, withdrawHealthData, consents } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const sending = useRef(false); // two taps at once must not record twice

  const onward = () => router.push('/onboarding/about');

  async function send(action: () => Promise<void>, after: () => void) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await action();
      after();
      onward();
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setProblem(t(name === 'NoConnection' ? 'onboarding.healthData.failed' : 'onboarding.serverError'));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const allow = () =>
    send(
      async () => {
        await grantConsent(api, 'HEALTH_DATA');
        await consents.remember('HEALTH_DATA', 'GRANTED').catch(() => undefined); // the phone knows at once (K-402)
      },
      () => update({ healthConsent: 'granted' }),
    );
  const withdraw = () =>
    send(
      // The same path as Settings (K-231): the server deletes what the consent covered — in onboarding nothing yet, the
      // answers are sent at the end — and the phone forgets its health entries.
      withdrawHealthData,
      () => update({ healthConsent: 'declined', weight: '', waist: '', avoid: '' }),
    );
  const decline = () => {
    update({ healthConsent: 'declined' });
    onward();
  };

  const granted = draft.healthConsent === 'granted';
  const declined = draft.healthConsent === 'declined';
  const choices = granted ? (
    <>
      <Button label={t('onboarding.continue')} onPress={onward} disabled={busy} />
      <Button label={t('onboarding.healthData.withdraw')} variant="ghost" onPress={withdraw} disabled={busy} />
    </>
  ) : (
    <>
      <Button label={t('onboarding.healthData.allow')} onPress={allow} disabled={busy} />
      <Button label={t('onboarding.healthData.notNow')} variant="ghost" onPress={decline} disabled={busy} />
    </>
  );
  const actions = (
    <View style={styles.actions}>
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
      {choices}
    </View>
  );

  return (
    <StepFrame step="healthData" title={t('consent.health_data.title')} actions={actions} backDisabled={busy}>
      <Text style={[styles.text, { color: color.text }]}>{t('consent.health_data.body')}</Text>
      {granted && <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.healthData.allowed')}</Text>}
      {declined && <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.healthData.declinedNote')}</Text>}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
