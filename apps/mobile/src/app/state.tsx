import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { ConsentStep } from '@/consent/ConsentStep';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { useChangesOnClose } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { stateParams } from '@/state/params';
import type { StateKind } from '@/state/stateService';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const KINDS: StateKind[] = ['TRAVELING', 'SICK', 'PAIN', 'BUSY', 'NEW_GYM'];
/** Sickness and pain are health data (K-1021, ADR-077 Ek 6): they need the health data consent. The rest are calendar facts. */
const HEALTH: ReadonlySet<StateKind> = new Set<StateKind>(['SICK', 'PAIN']);
const SAID: Record<string, string> = { NoConnection: 'state.screen.noConnection' };
const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * Saying life got in the way (K-518, ADR-038; new face K-981, ADR-077 #6 and Ek 6, prototype #life): one of five states as
 * a tile, and for how long, until the user is back or for 3 or 7 days (state.json). Declared, never asked (U9). From today,
 * the week pauses: the call waits, the number counts it neither way, the reminders go quiet (ADR-036 #7) — nothing counts
 * against anyone, and the safety net still runs (U13).
 *
 * Sick and In pain are health data: without the health data consent this screen asks for it, in place, and then declares
 * what was chosen, with its length — the choice is not lost on the way. Traveling, Busy week and New gym need none and go
 * through. The phone's idea of the consent can be behind the server's (CONSENT_REQUIRED on the declaring): the same step,
 * not a generic failure.
 */
export default function StateScreen() {
  const { state, report, api, consents } = useAppServices();
  useChangesOnClose(); // the tabs read again when this closes (K-1065)
  const { color } = useTheme();
  const [kind, setKind] = useState<StateKind | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [step, setStep] = useState<'choose' | 'consent'>('choose');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);

  async function send(action: () => Promise<void>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await action();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  /**
   * Declares what is chosen. A server that wants the consent first leads to the consent step, not to an error — unless the
   * consent was just given here (`consented`): then the server still wanting it (a text version it does not hold) is said
   * plainly and the choice stays, rather than the same step again without end.
   */
  async function declare(chosen: StateKind, consented = false) {
    try {
      // A count of days, counted with today by the server on the user's calendar (K-1021): the phone works out no date.
      await state.declare(chosen, days ?? undefined);
      router.back();
    } catch (error) {
      if (nameOf(error) === 'ConsentRequired' && !consented) return setStep('consent');
      report({ name: nameOf(error) });
      setStep('choose');
      setProblem(SAID[nameOf(error)] ?? 'state.screen.refused');
    }
  }

  const pause = () =>
    send(async () => {
      if (kind === null) return;
      // Asked before anything is sent, on the first tap: a consent the phone cannot read is not given (never a silent no-op).
      if (HEALTH.has(kind) && !(await consents.granted('HEALTH_DATA').catch(() => false))) return setStep('consent');
      await declare(kind);
    });

  // The consent given here is recorded on the server and known to the phone at once; then the choice goes through.
  const allow = () =>
    send(async () => {
      try {
        await grantConsent(api, 'HEALTH_DATA');
        await consents.remember('HEALTH_DATA', 'GRANTED');
      } catch (error) {
        report({ name: nameOf(error) });
        return setProblem('state.consent.failed');
      }
      if (kind !== null) await declare(kind, true);
    });

  const said = problem === null ? null : <ProblemText style={[styles.text, { color: color.text }]}>{t(problem)}</ProblemText>;

  if (step === 'consent') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
        <ConsentStep
          title={t('consent.health_data.title')}
          why={t('state.consent.why')}
          allow={t('state.consent.allow')}
          notNow={t('state.consent.notNow')}
          onAllow={() => void allow()}
          onNotNow={() => {
            setProblem(null);
            setStep('choose');
          }}
          busy={busy}
          problem={problem === null ? null : t(problem)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('state.screen.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('state.screen.intro')}</Text>
        <View style={styles.tiles}>
          {KINDS.map((option) => {
            const chosen = kind === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={t(`state.tile.${option.toLowerCase()}`)}
                accessibilityState={{ checked: chosen }}
                onPress={() => setKind(option)}
                style={[
                  styles.tile,
                  { backgroundColor: color.surface, borderColor: chosen ? color.accent : color.surface },
                ]}>
                <Text style={[styles.tileLabel, { color: color.text }]}>{t(`state.tile.${option.toLowerCase()}`)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.label, { color: color.muted }]}>{t('state.screen.until')}</Text>
        <View style={styles.chips}>
          <Chip touch label={t('state.screen.untilBack')} selected={days === null} onPress={() => setDays(null)} />
          {stateParams.untilChoicesDays.map((n) => (
            <Chip touch key={n} label={t('state.screen.forDays', { days: n })} selected={days === n} onPress={() => setDays(n)} />
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: tokens.size.primaryButton,
    borderRadius: tokens.radius.option,
    borderWidth: tokens.border.ring,
    padding: tokens.space.md,
    justifyContent: 'center',
  },
  tileLabel: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
});
