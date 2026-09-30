import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { finishOnboarding } from '@/onboarding/finish';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Apple Health, the last step (prototype 1.8, ADR-018). The consent text says what is read and what never is.
 * "Connect" records the consent, then shows Apple's own sheet; "Not now" skips both. Either way onboarding finishes here:
 * the starting records and the profile (finish.ts). Where HealthKit is not in the build (Expo Go), the screen says so and
 * records no consent.
 */
export default function AppleHealthStep() {
  const { draft } = useDraft();
  const { api, health, queue, profile, units } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const working = useRef(false);

  async function finish(connect: boolean) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      if (connect) {
        try {
          await grantConsent(api, 'APPLE_HEALTH');
          await health.requestRead();
        } catch {
          setProblem(t('onboarding.appleHealth.failed'));
          return;
        }
      }
      try {
        await finishOnboarding({
          draft,
          units: units.current(),
          queue,
          profile,
          now: new Date(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch {
        setProblem(t('onboarding.saveFailed'));
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  // Built outside the JSX below, like the other conditional parts (the raw-text guard reads JSX children).
  const choices = health.available ? (
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
    <StepFrame step="appleHealth" title={t('consent.apple_health.title')} actions={actions}>
      <Text style={[styles.text, { color: color.text }]}>{t('consent.apple_health.body')}</Text>
      {!health.available && <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.appleHealth.unavailable')}</Text>}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
