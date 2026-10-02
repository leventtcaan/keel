import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { OptionCard } from '@/components/OptionCard';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { stateParams } from '@/state/params';
import type { StateKind } from '@/state/stateService';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { localDay } from '@/today/today';

const KINDS: StateKind[] = ['TRAVELING', 'SICK', 'PAIN', 'BUSY', 'NEW_GYM'];
const SAID: Record<string, string> = { NoConnection: 'state.screen.noConnection' };
const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/** The last day of a few days counted with today, on the phone's calendar. */
function lastDay(days: number): string {
  const now = new Date();
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1));
}

/**
 * Saying life got in the way (K-518, ADR-038, L3 §4.2): one of five states, each said in a line, until the user is back
 * or for a few days (state.json). Declared, never asked (U9). From today, the week pauses: the call waits, the number
 * counts it neither way, the reminders go quiet (ADR-036 #7) — the safety net still runs (U13).
 */
export default function StateScreen() {
  const { state, report } = useAppServices();
  const { color } = useTheme();
  const [kind, setKind] = useState<StateKind | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);

  async function pause() {
    if (kind === null || sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await state.declare(kind, days === null ? undefined : lastDay(days));
      router.back();
    } catch (error) {
      report({ name: nameOf(error) });
      setProblem(SAID[nameOf(error)] ?? 'state.screen.refused');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const said = problem === null ? null : <Text style={[styles.text, { color: color.text }]}>{t(problem)}</Text>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('state.screen.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('state.screen.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('state.screen.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('state.screen.intro')}</Text>
        {KINDS.map((option) => (
          <OptionCard
            key={option}
            title={t(`state.kind.${option.toLowerCase()}.title`)}
            body={t(`state.kind.${option.toLowerCase()}.body`)}
            selected={kind === option}
            onPress={() => setKind(option)}
          />
        ))}
        <Text style={[styles.label, { color: color.muted }]}>{t('state.screen.until')}</Text>
        <View style={styles.chips}>
          <Chip label={t('state.screen.untilBack')} selected={days === null} onPress={() => setDays(null)} />
          {stateParams.untilChoicesDays.map((n) => (
            <Chip key={n} label={t('state.screen.forDays', { days: n })} selected={days === n} onPress={() => setDays(n)} />
          ))}
        </View>
        {said}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('state.screen.pause')} onPress={() => void pause()} disabled={kind === null || busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
  back: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
