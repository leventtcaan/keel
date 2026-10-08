import { router } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * #ob-consent, the health data consent (K-312, ADR-007, GDPR Art. 9): its own screen, before the first health question.
 * What it covers in three lines; the full text, whose version is the one recorded, one tap away (ADR-072 #2). "Allow"
 * records it on the server before moving on. "Not now" says what that means and offers "Continue without", which asks
 * nothing health later in the walk (the weight). Once allowed it can be taken back right here (Art. 7(3)): withdrawn on
 * the server, and the health answers so far leave the draft with it. While an answer is on its way, the other choice and
 * the way back are off, so the last choice made is the one recorded.
 */
export default function HealthDataStep() {
  const { draft, update } = useDraft();
  const { api, report, withdrawHealthData, consents } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fullText, setFullText] = useState(false);
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

  const granted = draft.healthConsent === 'granted';
  const declined = draft.healthConsent === 'declined';
  let choices: ReactNode;
  if (granted) {
    choices = (
      <>
        <Button label={t('onboarding.continue')} onPress={onward} disabled={busy} />
        <Button label={t('onboarding.healthData.withdraw')} variant="ghost" onPress={withdraw} disabled={busy} />
      </>
    );
  } else if (declined) {
    choices = (
      <>
        <Button label={t('onboarding.healthData.allow')} onPress={allow} disabled={busy} />
        <Button label={t('onboarding.consent.continueWithout')} variant="ghost" onPress={onward} disabled={busy} />
      </>
    );
  } else {
    choices = (
      <>
        <Button label={t('onboarding.healthData.allow')} onPress={allow} disabled={busy} />
        <Button
          label={t('onboarding.healthData.notNow')}
          variant="ghost"
          onPress={() => update({ healthConsent: 'declined' })}
          disabled={busy}
        />
      </>
    );
  }
  const actions = (
    <View style={styles.actions}>
      {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
      {choices}
    </View>
  );

  // Built outside the JSX below, like the other conditional parts (the raw-text guard reads JSX children).
  const text = fullText ? (
    <Text style={[styles.full, { color: color.textSecondary, backgroundColor: color.surface }]}>{t('consent.health_data.body')}</Text>
  ) : (
    <Pressable accessibilityRole="button" onPress={() => setFullText(true)} style={styles.link}>
      <Text style={[styles.linkText, { color: color.accent }]}>{t('onboarding.consent.fullText')}</Text>
    </Pressable>
  );
  const note = granted ? t('onboarding.healthData.allowed') : declined ? t('onboarding.healthData.declinedNote') : null;

  return (
    <StepFrame
      step="consent"
      title={t('onboarding.consent.title')}
      why={t('onboarding.consent.why')}
      actions={actions}
      backDisabled={busy}>
      <View style={styles.points}>
        <Text style={[styles.point, { color: color.text }]}>{t('onboarding.consent.kept')}</Text>
        <Text style={[styles.point, { color: color.text }]}>{t('onboarding.consent.sold')}</Text>
        <Text style={[styles.point, { color: color.text }]}>{t('onboarding.consent.deleted')}</Text>
      </View>
      {text}
      {note !== null && <Text style={[styles.note, { color: color.textSecondary, backgroundColor: color.surface }]}>{note}</Text>}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  points: { gap: tokens.space.md },
  point: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  link: { minHeight: tokens.size.touch, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  full: { fontSize: tokens.type.bodySmall, padding: tokens.space.md, borderRadius: tokens.radius.button },
  note: { fontSize: tokens.type.bodySmall, padding: tokens.space.md, borderRadius: tokens.radius.button, overflow: 'hidden' },
});
