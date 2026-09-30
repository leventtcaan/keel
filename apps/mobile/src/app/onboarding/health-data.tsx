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
 * later in the walk (weight, waist, foods to avoid). Withdrawing is Settings' (K-309).
 */
export default function HealthDataStep() {
  const { draft, update } = useDraft();
  const { api } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const granting = useRef(false); // two taps at once must not record twice

  const onward = () => router.push('/onboarding/about');

  async function allow() {
    if (granting.current) return;
    granting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await grantConsent(api, 'HEALTH_DATA');
      update({ healthConsent: 'granted' });
      onward();
    } catch {
      setFailed(true);
    } finally {
      granting.current = false;
      setBusy(false);
    }
  }

  const granted = draft.healthConsent === 'granted';
  const declined = draft.healthConsent === 'declined';
  const actions = granted ? (
    <Button label={t('onboarding.continue')} onPress={onward} />
  ) : (
    <View style={styles.actions}>
      {failed && <Text style={[styles.text, { color: color.text }]}>{t('onboarding.healthData.failed')}</Text>}
      <Button label={t('onboarding.healthData.allow')} onPress={allow} disabled={busy} />
      <Button
        label={t('onboarding.healthData.notNow')}
        variant="ghost"
        onPress={() => {
          update({ healthConsent: 'declined' });
          onward();
        }}
      />
    </View>
  );

  return (
    <StepFrame step="healthData" title={t('consent.health_data.title')} actions={actions}>
      <Text style={[styles.text, { color: color.text }]}>{t('consent.health_data.body')}</Text>
      {granted && <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.healthData.allowed')}</Text>}
      {declined && (
        <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.healthData.declinedNote')}</Text>
      )}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
