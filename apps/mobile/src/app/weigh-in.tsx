import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { healthParams } from '@/health/params';
import { onboardingParams } from '@/onboarding/params';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, localDay } from '@/today/today';
import { parseWeightKg } from '@/units/units';
import { WeightChart } from '@/weighIn/WeightChart';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
const DAY_MS = 24 * 3600 * 1000;

/**
 * The weigh-in (K-402): the day's one required ten seconds. Typed in the user's unit, kept in kg at the server's precision
 * (K-310), saved on the phone first and sent when it can be (K-304). Health data: when the consent is not given, the
 * consent comes first and nothing can be typed — nothing health is kept on the phone without it (ADR-030 #25). Below,
 * the last weeks: every weigh-in faint, the 7-day trend clear, and in the first 14 days a note instead of any word on the
 * trend (U8).
 */
export default function WeighInScreen() {
  const { api, queue, consents, report, healthWriting } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ weighIns: Schemas['WeighIn'][]; trend: Schemas['TrendPoint'][] } | null>(null);
  const saving = useRef(false); // two taps at once must not save twice

  // The window is fixed when the screen opens: the chart's days and "the first 14 days" are counted from that moment.
  const [{ now, today }] = useState(() => {
    const opened = Date.now();
    return { now: opened, today: localDay(new Date(opened)) };
  });
  // The last weeks the decisions read, or the year — the history brought in (K-616) is there to be seen (ADR-018 §3).
  const [range, setRange] = useState<Range>('weeks');
  const from = localDay(new Date(now - ((range === 'year' ? healthParams.historyDays : healthParams.chartDays) - 1) * DAY_MS));

  useEffect(() => {
    void consents.granted('HEALTH_DATA').then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  useEffect(() => {
    if (step !== 'entry') return;
    const range = { params: { query: { from, to: today } } };
    void Promise.all([load(() => api.GET('/v1/weigh-ins', range)), load(() => api.GET('/v1/weight-trend', range))]).then(([weighIns, trend]) => {
      // Offline or not there yet: no chart, the entry still works.
      if (weighIns.state === 'ready' && trend.state === 'ready') setHistory({ weighIns: weighIns.value, trend: trend.value });
    });
  }, [api, step, from, today]);

  const allow = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await grantConsent(api, 'HEALTH_DATA');
      await consents.remember('HEALTH_DATA', 'GRANTED');
      setStep('entry');
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('weighIn.consent.failed'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (saving.current) return;
    const kg = parseWeightKg(text, units);
    if (kg === null || !(kg > 0 && kg <= onboardingParams.weighInMaxKg)) {
      setProblem(t('weighIn.invalid'));
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const weighIn = { clientId: newClientId(), measuredAt: new Date().toISOString(), kg, source: 'MANUAL' as const };
      await queue.record({ kind: 'weighIn', body: weighIn });
      // To Apple Health too, if that switch is on (K-412); not waited for — it reports its own failure.
      void healthWriting.weighInSaved({ id: weighIn.clientId, kg, at: new Date(weighIn.measuredAt) });
      router.back();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('weighIn.saveFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  // The first 14 days are the user's own: weigh-ins brought in from before do not end them (U8, ADR-053).
  const firstDay = history?.weighIns
    .filter((w) => w.source !== 'IMPORT')
    .reduce<string | null>((first, w) => (first === null || w.measuredAt < first ? w.measuredAt : first), null);
  const early = firstDay != null && now - Date.parse(firstDay) < onboardingParams.noInterpretationDays * DAY_MS;

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.health_data.body')}</Text>
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        <Button label={t('weighIn.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('weighIn.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;
  const entry =
    step === 'entry' ? (
      <View style={styles.part}>
        <TextField
          label={t('weighIn.label', { unit })}
          value={text}
          onChangeText={(next) => {
            setText(next);
            setProblem(null);
          }}
          suffix={unit}
          hint={t('weighIn.note')}
          problem={problem}
          keyboardType="decimal-pad"
          maxLength={6}
        />
        <Button label={t('weighIn.save')} onPress={() => void save()} disabled={busy} />
      </View>
    ) : null;
  const chart =
    step === 'entry' && history !== null && history.weighIns.length > 0 ? (
      <View style={styles.part}>
        <Text style={[styles.label, { color: color.muted }]}>{t(range === 'year' ? 'weighIn.chart.yearTitle' : 'weighIn.chart.title')}</Text>
        <RangeChoice range={range} onChange={setRange} />
        <WeightChart from={from} to={today} weighIns={history.weighIns} trend={history.trend} />
        {early && <Text style={[styles.small, { color: color.muted }]}>{t('weighIn.earlyNote')}</Text>}
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('weighIn.title')}</ScreenTitle>
        {consentStep}
        {entry}
        {chart}
      </ScrollView>
    </SafeAreaView>
  );
}

type Range = 'weeks' | 'year';

function RangeChoice({ range, onChange }: { range: Range; onChange: (range: Range) => void }) {
  return (
    <View style={styles.choice}>
      <Chip label={t('weighIn.chart.weeks')} selected={range === 'weeks'} onPress={() => onChange('weeks')} />
      <Chip label={t('weighIn.chart.year')} selected={range === 'year'} onPress={() => onChange('year')} />
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', gap: tokens.space.sm },
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
