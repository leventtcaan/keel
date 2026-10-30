import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { ModalClose } from '@/components/ModalClose';
import { ProblemText } from '@/components/ProblemText';
import { ConsentText } from '@/consent/ConsentText';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { LogMeal } from '@/food/LogMeal';
import { peekMeal } from '@/food/handoff';
import { MealItems } from '@/food/MealItems';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Step = 'checking' | 'consent' | 'entry';

/**
 * Logging food (K-407, K-1063; Evre 7 A, ADR-090 Ek 6). The health data consent first (ADR-030 #25; nothing typed is kept without it), then
 * one of two screens: `LogMeal` for a new meal — the meal, the search, the tray, what the user eats, the portion step — or `MealItems` for a
 * meal's items to change and keep: a logged meal corrected where it stands (`?edit=<id>&day=<day>&item=<n>`, which opens that item's portion
 * sheet and nothing else) or a meal the coach read, to confirm. `?day=<day>` logs into that day (a past one too: the meal is given the slot's
 * usual hour); `?slot=` starts on a meal.
 */
export default function MealScreen() {
  const { api, consents, report } = useAppServices();
  const { color } = useTheme();
  const { edit, day, slot, item } = useLocalSearchParams<{ edit?: string; day?: string; slot?: string; item?: string }>();
  const [step, setStep] = useState<Step>('checking');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A meal the coach read comes in to be confirmed, as a correction does: the items screen.
  const [handed] = useState(() => edit === undefined && peekMeal() !== null);

  useEffect(() => {
    // Not known (a failing keychain) is not given: the consent step, never an endless wait.
    void consents
      .granted('HEALTH_DATA')
      .catch(() => false)
      .then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  const allow = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await grantConsent(api, 'HEALTH_DATA');
      await consents.remember('HEALTH_DATA', 'GRANTED');
      setStep('entry');
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.consent.failed'));
    } finally {
      setBusy(false);
    }
  };

  const consent =
    step === 'consent' ? (
      <FormScroll contentContainerStyle={styles.body}>
        <View style={styles.part}>
          <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
          <ConsentText kind="HEALTH_DATA" />
          {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
          <Button label={t('meal.consent.allow')} onPress={() => void allow()} disabled={busy} />
          <Button label={t('meal.consent.notNow')} variant="secondary" onPress={() => router.back()} disabled={busy} />
        </View>
      </FormScroll>
    ) : null;
  const entry =
    step !== 'entry' ? null : edit !== undefined || handed ? (
      <MealItems {...(edit === undefined ? {} : { edit })} {...(day === undefined ? {} : { day })} {...(item === undefined ? {} : { item })} />
    ) : (
      <LogMeal {...(day === undefined ? {} : { day })} {...(slot === undefined ? {} : { slotParam: slot })} />
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ModalClose title={t(edit === undefined ? 'meal.title' : 'meal.editTitle')} accessibilityLabel={t('meal.closeLabel')} />
      {consent}
      {entry}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
});
