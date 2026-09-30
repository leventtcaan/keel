import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { connectAppleHealth } from '@/consent/consents';
import { t } from '@/copy';
import { finishOnboarding } from '@/onboarding/finish';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * Apple Health, the last step (prototype 1.8, ADR-018). The consent text says what is read and what never is.
 * Offered only with the health data consent: what it brings in is health data (GDPR Art. 9). "Connect" shows Apple's
 * sheet, then records the consent — so a sheet that fails leaves no consent behind; nothing is read before the consent
 * is recorded (K-404 reads only with it). "Not now" skips both. Either way onboarding finishes here (finish.ts). Where
 * HealthKit is not in the build (Expo Go), the screen says so.
 */
export default function AppleHealthStep() {
  const { draft } = useDraft();
  const { api, health, queue, profile, units, report } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const working = useRef(false);

  const fail = (error: unknown, key: string) => {
    report({ name: nameOf(error) });
    setProblem(t(key));
  };

  async function connect(): Promise<boolean> {
    try {
      await connectAppleHealth(api, health);
      return true;
    } catch (error) {
      const key = { HealthSheetFailed: 'onboarding.appleHealth.sheetFailed', NoConnection: 'onboarding.appleHealth.failed' }[
        nameOf(error)
      ];
      fail(error, key ?? 'onboarding.serverError');
      return false;
    }
  }

  async function finish(withHealth: boolean) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      if (withHealth && !(await connect())) return;
      await finishOnboarding({
        draft,
        units: units.current(),
        queue,
        profile,
        now: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      fail(error, nameOf(error) === 'NoConnection' ? 'onboarding.saveFailed' : 'onboarding.serverError');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const offered = health.available && draft.healthConsent === 'granted';
  const note = !health.available
    ? t('onboarding.appleHealth.unavailable')
    : offered
      ? null
      : t('onboarding.appleHealth.needsConsent');
  // Built outside the JSX below, like the other conditional parts (the raw-text guard reads JSX children).
  const choices = offered ? (
    <>
      <Button label={t('onboarding.appleHealth.connect')} onPress={() => finish(true)} disabled={busy} />
      <Button label={t('onboarding.appleHealth.notNow')} variant="ghost" onPress={() => finish(false)} disabled={busy} />
    </>
  ) : (
    <Button label={t('onboarding.appleHealth.finish')} onPress={() => finish(false)} disabled={busy} />
  );
  const actions = (
    <View style={styles.actions}>
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
      {choices}
    </View>
  );

  return (
    <StepFrame step="appleHealth" title={t('consent.apple_health.title')} actions={actions} backDisabled={busy}>
      <Text style={[styles.text, { color: color.text }]}>{t('consent.apple_health.body')}</Text>
      {note !== null && <Text style={[styles.note, { color: color.muted }]}>{note}</Text>}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
