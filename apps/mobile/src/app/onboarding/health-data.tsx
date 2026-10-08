import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText, useProblem } from '@/components/ProblemText';
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
 *
 * Walked again after a close (K-986): the server may still hold a grant from the first walk. The screen asks again as on
 * a first walk, and reads on opening whether a grant is held, to the text shown now or an older one (consents.held: the
 * server's answer, or offline what the phone kept). While one is, "Continue without" withdraws it the same way, before
 * moving on (GDPR Art. 7(3): the last choice counts); one that does not go through says so and stays, and the same
 * button tries again. Unknown (the server answered with an error): withdrawn anyway, as the server does nothing when
 * nothing was given. An "Allow" sent counts as held even if its answer never came: it may have been recorded.
 */
export default function HealthDataStep() {
  const { draft, update } = useDraft();
  const { api, report, withdrawHealthData, consents } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  const [fullText, setFullText] = useState(false);
  const sending = useRef(false); // two taps at once must not record twice
  // Whether the server may hold a grant: read on opening, then kept up to date by this screen's own answers. "unknown"
  // counts as held. `held` answers "unknown" rather than failing; a failure anyway would be no answer either.
  const given = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    given.current = consents.held('HEALTH_DATA').then(
      (held) => held !== false,
      () => true,
    );
  }, [consents]);

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

  // The same path as Settings (K-231): the server deletes what the consent covered — in onboarding nothing yet, the
  // answers are sent at the end — and the phone forgets its health entries.
  async function takeBack() {
    await withdrawHealthData();
    given.current = Promise.resolve(false);
  }

  const allow = () =>
    send(
      async () => {
        // Taken as held before it is sent: a grant whose answer is lost may still be recorded, so a decline withdraws it.
        given.current = Promise.resolve(true);
        await grantConsent(api, 'HEALTH_DATA');
        await consents.remember('HEALTH_DATA', 'GRANTED').catch(() => undefined); // the phone knows at once (K-402)
      },
      () => update({ healthConsent: 'granted' }),
    );
  const withdraw = () =>
    send(takeBack, () => update({ healthConsent: 'declined', weight: '', waist: '', avoid: '' }));
  // Declined with a grant from an earlier walk still held: taken back before going on (K-986).
  const continueWithout = () =>
    send(
      async () => {
        if (await (given.current ?? true)) await takeBack();
      },
      () => undefined,
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
        <Button label={t('onboarding.consent.continueWithout')} variant="ghost" onPress={continueWithout} disabled={busy} />
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
      {problem !== null && (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={occurrence}>
          {problem}
        </ProblemText>
      )}
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
