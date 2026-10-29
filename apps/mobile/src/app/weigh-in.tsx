import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { KeyboardFrame } from '@/components/KeyboardFrame';
import { ModalClose } from '@/components/ModalClose';
import { Segmented } from '@/components/Segmented';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Stepper } from '@/components/Stepper';
import { ConsentText } from '@/consent/ConsentText';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { HealthJit } from '@/health/HealthJit';
import { healthParams } from '@/health/params';
import { onboardingParams } from '@/onboarding/params';
import { useSaved } from '@/saved/saved';
import { undoThrough } from '@/saved/undo';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load, localDay } from '@/today/today';
import { formatWeight, parseWeightKg, weightDecimals, weightInput, weightStep } from '@/units/units';
import { lastWeighInDate, prefillKg } from '@/weighIn/last';
import { TrendCount } from '@/weighIn/TrendCount';
import { WeightChart } from '@/weighIn/WeightChart';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
const DAY_MS = 24 * 3600 * 1000;

/**
 * The weigh-in (K-402, K-980, K-1044, prototype `#weigh`): the day's one required ten seconds. The last weigh-in is filled in
 * (the server's `last`, in the user's unit) in the shared Stepper: it moves a tenth at a time or is typed over, and is kept
 * in kg at the server's precision (K-310), saved on the phone first and sent when it can be (K-304). Saved, the sheet closes
 * and the app's one banner says "Saved" with Undo (ADR-070 Ek 2 #6) — the weigh-in deleted on the server and forgotten
 * here, a copy still waiting dropped (ADR-074 Ek 2). Apple Health is asked under the entry, the first time (ADR-018 Ek 1).
 * Health data: when the consent is not given, the consent comes first and nothing can be typed — nothing health is kept on
 * the phone without it (ADR-030 #25). The trend is drawn when the server says it is ready (7 weigh-in days, `trendReady`,
 * K-1018); before that the screen counts the weigh-ins toward it, and in the first 14 days the chart carries a short note
 * instead of any word on the trend (U8).
 */
export default function WeighInScreen() {
  const { api, queue, consents, report, healthWriting, takeBack } = useAppServices();
  const saved = useSaved();
  const units = useUnits();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  // The number in the Stepper, in the user's unit; null: nothing filled in and nothing typed.
  const [value, setValue] = useState<number | null>(null);
  const [problem, setProblem, occurrence] = useProblem();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Loaded<Schemas['WeighInSummary']> | null>(null);
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
      const filled = Number(weightInput(kg, units));
      // What was typed while the answer was coming stays.
      setValue((typed) => typed ?? filled);
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
    const kg = value === null ? null : parseWeightKg(String(value), units);
    if (kg === null || !(kg > 0 && kg <= onboardingParams.weighInMaxKg)) {
      setProblem(t('weighIn.invalid'));
      return;
    }
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const weighIn = { clientId: newClientId(), measuredAt: new Date().toISOString(), kg, source: 'MANUAL' as const };
      await queue.record({ kind: 'weighIn', body: weighIn });
      // To Apple Health too, if that switch is on (K-412); not waited for — it reports its own failure.
      void healthWriting.weighInSaved({ id: weighIn.clientId, kg, at: new Date(weighIn.measuredAt) });
      // Whether the Health switch is on and iOS allows it now: that copy is Health's, and Undo leaves it.
      const health = healthWriting.shown('weighIns') === 'on';
      // The sheet closes and the banner takes over: it keeps the weigh-in to take back, for the time of the parameter. The
      // lock stays on: a second tap while the sheet goes would keep a second weigh-in.
      router.back();
      saved({
        detail: formatWeight(kg, units),
        undo: undoThrough(
          () => takeBack(weighIn.clientId, async (id) => (await api.DELETE('/v1/weigh-ins/{id}', { params: { path: { id } } })).response.status),
          report,
          { said: t(health ? 'weighIn.undoneHealth' : 'weighIn.undoneSaid'), offline: t('weighIn.undoOffline'), failed: t('weighIn.undoFailed') },
        ),
      });
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('weighIn.saveFailed'));
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
  // Before the trend is ready: how many of the weigh-ins it needs are in (T-9). Ready, the chart below says it.
  const counting = summary?.state === 'ready' && !summary.value.trendReady ? summary.value : null;
  const trendLine = counting === null ? null : <TrendCount count={counting.weighInCount} min={counting.trendMinWeighIns} />;

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <ConsentText kind="HEALTH_DATA" />
        {problem !== null && (
          <ProblemText style={[styles.text, { color: color.text }]} occurrence={occurrence}>
            {problem}
          </ProblemText>
        )}
        <Button label={t('weighIn.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('weighIn.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  const problemLine =
    problem !== null ? (
      <ProblemText style={[styles.text, { color: color.text }]} occurrence={occurrence}>
        {problem}
      </ProblemText>
    ) : null;
  const entry =
    step === 'entry' ? (
      <View style={styles.part}>
        <Stepper
          label={t('weighIn.label', { unit })}
          value={value}
          unit={unit}
          step={weightStep}
          decimals={weightDecimals}
          onChange={(next) => {
            setValue(next);
            setProblem(null);
          }}
          onEmpty={() => setValue(null)}
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
        <HealthJit />
      </View>
    ) : null;

  // The one primary, in the dock under the scroll and on top of the keyboard (K-1065): Save is never under it.
  const dock =
    step === 'entry' ? (
      <View style={styles.dock}>
        <Button label={t('weighIn.save')} onPress={() => void save()} disabled={busy} />
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
      <ModalClose accessibilityLabel={t('weighIn.closeLabel')} />
      <KeyboardFrame>
        <FormScroll contentContainerStyle={styles.body}>
          <ScreenTitle>{t('weighIn.title')}</ScreenTitle>
          {consentStep}
          {entry}
          {chart}
        </FormScroll>
        {dock}
      </KeyboardFrame>
    </SafeAreaView>
  );
}

type Range = 'weeks' | 'year';

/** The chart's range: two exclusive choices, so the segmented control Settings uses (ADR-070 Ek 2 #2), not two chips. */
function RangeChoice({ range, onChange }: { range: Range; onChange: (range: Range) => void }) {
  return (
    <Segmented
      testID="weigh-in-range"
      options={[
        { value: 'weeks', label: t('weighIn.chart.weeks') },
        { value: 'year', label: t('weighIn.chart.year') },
      ]}
      value={range}
      onChange={onChange}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.lg },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  part: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  last: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold, textAlign: 'center' },
  small: { fontSize: tokens.type.bodySmall },
});
