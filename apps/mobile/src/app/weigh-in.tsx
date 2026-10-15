import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { HealthJit } from '@/health/HealthJit';
import { healthParams } from '@/health/params';
import { onboardingParams } from '@/onboarding/params';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load, localDay } from '@/today/today';
import { formatWeight, parseWeightKg, weightDecimals, weightInput } from '@/units/units';
import { lastWeighInDate, prefillKg } from '@/weighIn/last';
import { ScaleRow } from '@/weighIn/ScaleRow';
import { canStepWeight, stepWeightText } from '@/weighIn/step';
import { WeightChart } from '@/weighIn/WeightChart';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
const DAY_MS = 24 * 3600 * 1000;

/**
 * The weigh-in (K-402, K-980, prototype `#weigh`): the day's one required ten seconds. The last weigh-in is filled in
 * (the server's `last`, in the user's unit), moves a tenth at a time or is typed over, and is kept in kg at the server's
 * precision (K-310), saved on the phone first and sent when it can be (K-304). Saved, the screen says so and offers Undo — the
 * weigh-in deleted on the server and forgotten here, a copy still waiting dropped (ADR-074 Ek 2) — and, the first time,
 * Apple Health under it (ADR-018 Ek 1). Health data: when the consent is not given, the consent comes first and nothing can
 * be typed — nothing health is kept on the phone without it (ADR-030 #25). The trend is drawn when the server says it is
 * ready (7 weigh-in days, `trendReady`, K-1018); before that the screen says when it starts, and in the first 14 days the
 * chart carries a short note instead of any word on the trend (U8).
 */
export default function WeighInScreen() {
  const { api, queue, consents, report, healthWriting, takeBack } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [text, setText] = useState('');
  const [problem, setProblem, occurrence] = useProblem();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Loaded<Schemas['WeighInSummary']> | null>(null);
  const [history, setHistory] = useState<{ weighIns: Schemas['WeighIn'][]; trend: Schemas['TrendPoint'][] } | null>(null);
  // The weigh-in just kept, while the screen offers to take it back; `health`: a copy was written to Apple Health (it stays).
  const [saved, setSaved] = useState<{ clientId: string; kg: number; health: boolean } | null>(null);
  // After a take-back with a copy in Apple Health: said in place of the trend line until the next save.
  const [healthStays, setHealthStays] = useState(false);
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

  // The last weigh-in and whether the trend is ready (K-1018): what is filled in and what is drawn. Unread (offline, a 404),
  // nothing is filled in and no line is drawn: the entry still works, typed.
  useEffect(() => {
    if (step !== 'entry') return;
    let live = true;
    void load(() => api.GET('/v1/weigh-ins/summary')).then((read) => {
      if (!live) return;
      setSummary(read);
      const kg = read.state === 'ready' ? prefillKg(read.value.last) : null;
      if (kg === null) return;
      const filled = weightInput(kg, units);
      // What was typed while the answer was coming stays.
      setText((typed) => (typed === '' ? filled : typed));
    });
    return () => {
      live = false;
    };
  }, [api, step, units]);

  const trendReady = summary?.state === 'ready' && summary.value.trendReady;
  useEffect(() => {
    if (step !== 'entry' || !trendReady) return;
    const range = { params: { query: { from, to: today } } };
    void Promise.all([load(() => api.GET('/v1/weigh-ins', range)), load(() => api.GET('/v1/weight-trend', range))]).then(([weighIns, trend]) => {
      // Offline or not there yet: no chart, the entry still works.
      if (weighIns.state === 'ready' && trend.state === 'ready') setHistory({ weighIns: weighIns.value, trend: trend.value });
    });
  }, [api, step, trendReady, from, today]);

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
    setProblem(null);
    setHealthStays(false);
    try {
      const weighIn = { clientId: newClientId(), measuredAt: new Date().toISOString(), kg, source: 'MANUAL' as const };
      await queue.record({ kind: 'weighIn', body: weighIn });
      // To Apple Health too, if that switch is on (K-412); not waited for — it reports its own failure.
      void healthWriting.weighInSaved({ id: weighIn.clientId, kg, at: new Date(weighIn.measuredAt) });
      // Whether the Health switch is on and iOS allows it now: that copy is Health's, and Undo leaves it.
      setSaved({ clientId: weighIn.clientId, kg, health: healthWriting.shown('weighIns') === 'on' });
      announce(t('weighIn.savedSaid', { value: formatWeight(kg, units) }));
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('weighIn.saveFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const undo = async () => {
    if (saving.current || saved === null) return;
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result = await takeBack(saved.clientId, async (id) => (await api.DELETE('/v1/weigh-ins/{id}', { params: { path: { id } } })).response.status);
      if (result === 'taken') {
        setSaved(null);
        setHealthStays(saved.health);
        announce(t(saved.health ? 'weighIn.undoneHealth' : 'weighIn.undoneSaid'));
      } else {
        // Offline is the connection, said as that; the button stays and is tried again when it is back.
        setProblem(t(result === 'offline' ? 'weighIn.undoOffline' : 'weighIn.undoFailed'));
      }
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('weighIn.undoFailed'));
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
  const last = summary?.state === 'ready' ? summary.value.last : undefined;
  const lastDate = last === undefined ? null : lastWeighInDate(last.measuredAt, new Date(now));
  const trendLine = healthStays ? (
    <Text style={[styles.small, { color: color.muted }]}>{t('weighIn.undoneHealth')}</Text>
  ) : (
    summary?.state === 'ready' && !summary.value.trendReady ? (
      <Text style={[styles.small, { color: color.muted }]}>{t('weighIn.trendSoon', { count: summary.value.trendMinWeighIns })}</Text>
    ) : null
  );

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.health_data.body')}</Text>
        {problem !== null && (
          <ProblemText style={[styles.text, { color: color.text }]} occurrence={occurrence}>
            {problem}
          </ProblemText>
        )}
        <Button label={t('weighIn.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('weighIn.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  const step1 = String(10 ** -weightDecimals);
  const problemLine =
    problem !== null ? (
      <ProblemText style={[styles.text, { color: color.text }]} occurrence={occurrence}>
        {problem}
      </ProblemText>
    ) : null;
  const entry =
    step === 'entry' && saved === null ? (
      <View style={styles.part}>
        <ScaleRow
          label={t('weighIn.label', { unit })}
          value={text}
          onChangeText={(next) => {
            setText(next);
            setProblem(null);
          }}
          unit={unit}
          spokenUnit={t(units === 'METRIC' ? 'units.kgSpoken' : 'units.lbSpoken')}
          step={step1}
          canLower={canStepWeight(text, -1, units)}
          canRaise={canStepWeight(text, 1, units)}
          onLower={() => setText(stepWeightText(text, -1, units))}
          onRaise={() => setText(stepWeightText(text, 1, units))}
        />
        {last !== undefined && (
          <Text style={[styles.last, { color: color.muted }]}>
            {lastDate === null
              ? t('weighIn.last', { value: formatWeight(last.kg, units) })
              : t('weighIn.lastOn', { value: formatWeight(last.kg, units), date: lastDate })}
          </Text>
        )}
        {problemLine}
        {trendLine}
        <Button label={t('weighIn.save')} onPress={() => void save()} disabled={busy} />
      </View>
    ) : null;

  const savedStep =
    step === 'entry' && saved !== null ? (
      <View style={styles.part}>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('weighIn.savedLine', { value: formatWeight(saved.kg, units) })}
        </Text>
        {trendLine}
        {problemLine}
        <HealthJit />
        <Button label={t('weighIn.undo')} variant="ghost" accessibilityLabel={t('weighIn.undoLabel')} onPress={() => void undo()} disabled={busy} />
        <Button label={t('weighIn.done')} onPress={() => router.back()} />
      </View>
    ) : null;

  const chart =
    step === 'entry' && trendReady && history !== null && history.weighIns.length > 0 ? (
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
        {savedStep}
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
  last: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold, textAlign: 'center' },
  small: { fontSize: tokens.type.bodySmall },
});
