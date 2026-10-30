import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { PLUS_CLEARANCE, PlusEntry } from '@/components/PlusEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { PhotoCard } from '@/photos/PhotoCard';
import { ConsistencyGrid } from '@/progress/ConsistencyGrid';
import { CallsCard } from '@/progress/CallsCard';
import { LiftsCard } from '@/progress/LiftsCard';
import { LockLine, MuscleBars, MusclesCard, StrengthCard } from '@/progress/Parts';
import { WeightCard } from '@/progress/WeightCard';
import { TargetsGrid } from '@/progress/TargetsGrid';
import { type ProgressRead, loadProgress } from '@/progress/read';
import { hasShareable } from '@/progress/shareable';
import { callsOf, heroOf, phaseOf, strengthOf, targetsOf, weightOf } from '@/progress/sections';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import type { Figure } from '@/train/demo';
import { movesOf } from '@/train/trainData';

type Schemas = components['schemas'];
type Read = { progress: ProgressRead; figure: Figure; firstWeeks: Loaded<Schemas['FirstWeeks']> };

/** The flow's week as the photo window reads it: over once the server has none (404); unknown without consent or offline. */
function flowWeek(read: Loaded<Schemas['FirstWeeks']>): number | 'over' | null {
  if (read.state === 'ready') return read.value.week;
  return read.state === 'none' ? 'over' : null;
}

/**
 * Progress (K-979, ADR-078, prototype `#progress`): the first days are four tappable targets, this week's planned muscles, a
 * locked strength and the weigh-ins toward the trend; after the first call, one sentence of results and the 12 weeks. Each part
 * opens when its own data arrives (the first workout, 7 weigh-ins, the first call); no chart is drawn empty. Every number is
 * the server's, every condition a field it sent; the phone counts nothing and works out no week. Photos stay on this phone
 * and the way to share is the user's.
 */
export default function ProgressScreen() {
  const { api, training, syncHealth, bodyFigure, report, queue } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const { day, data, reload } = useReadOnFocus(
    useCallback(
      async (day: string): Promise<Read> => {
        const named = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
        // What waits on the phone goes first (a meal just logged from this tab's "+"), so the server's day counts it (K-1051).
        await queue.drain().catch(named);
        // The Health read runs beside the server's, never before it; a Health that fails is reported by name and shows no steps.
        const [parts, trainData, own, stepsToday, firstWeeks, figure] = await Promise.all([
          loadProgress(api, day),
          training.read(api),
          training.own(api),
          syncHealth().then((health) => health.stepsToday, (error: unknown) => (named(error), null)),
          load(() => api.GET('/v1/first-weeks')),
          bodyFigure().catch((error: unknown) => (named(error), 'male' as Figure)),
        ]);
        return { progress: { ...parts, stepsToday, moves: movesOf(trainData, own) }, figure, firstWeeks };
      },
      [api, training, syncHealth, bodyFigure, report, queue],
    ),
    { afterSaves: true },
  );

  let body = null;
  if (data !== null) {
    const { progress, figure, firstWeeks } = data;
    const phase = phaseOf(progress);
    const hero = heroOf(progress, units);
    const targets = targetsOf(progress);
    const strength = strengthOf(progress);
    const weight = weightOf(progress);
    const calls = callsOf(progress);
    const lifts = progress.training.state === 'ready' ? progress.training.value.lifts : [];
    const muscles = progress.training.state === 'ready' ? progress.training.value.muscles : [];
    const weeks = progress.consistency.state === 'ready' ? progress.consistency.value.weeks : [];
    const failed = [progress.training, progress.consistency, progress.summary, progress.budget, progress.program, progress.calls, progress.trend].some((part) => part?.state === 'failed');

    // Built outside the JSX below (the raw-text guard reads JSX children).
    const running = phase === 'running';
    let strengthCard = null;
    if (strength === 'lifts') strengthCard = <LiftsCard lifts={lifts} moves={progress.moves} units={units} />;
    else if (strength !== null) strengthCard = <StrengthCard part={strength} lifts={lifts} moves={progress.moves} units={units} />;
    // The weigh-ins toward the trend, or the average once the server says it is ready (before the first call and after it).
    const weightCard = weight === null ? null : <WeightCard part={weight} units={units} />;
    // The map stays on this tab for good (K-1065): it fills as the user trains in the first days, and after the first call the
    // sets of each muscle against its target follow it as bars, so the view is the same one before and after.
    const musclesCard = <MusclesCard muscles={muscles} figure={figure} />;
    const barsCard = running ? <MuscleBars muscles={muscles} /> : null;
    const callsCard = calls === null ? null : <CallsCard items={calls.items} units={units} />;
    // The first days' targets only while there is no first call (or no consent to read one); not while it is unknown.
    const first = phase === 'first' || phase === 'locked';
    const targetsGrid = first && targets.length > 0 ? <TargetsGrid targets={targets} /> : null;
    const lock = phase === 'locked' ? <LockLine /> : null;
    const problem = failed ? (
      <View style={styles.note}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('progress.failed')}</Text>
        <Button label={t('progress.retry')} variant="ghost" size="sm" onPress={reload} />
      </View>
    ) : null;
    const top =
      hero === null ? null : (
        <DecisionBlock testID="progress-hero" title={hero.title}>
          {hero.sub === null ? null : <Text style={[styles.sub, { color: color.decisionMuted }]}>{hero.sub}</Text>}
        </DecisionBlock>
      );
    // The weight trend is the headline of someone cutting: it comes first, the strength and the map after it (Evre 7).
    const parts = running ? (
      <>
        {weightCard}
        {strengthCard}
        {musclesCard}
        {barsCard}
        <ConsistencyGrid weeks={weeks} />
        {callsCard}
      </>
    ) : (
      <>
        {weightCard}
        {musclesCard}
        {strengthCard}
        {callsCard}
      </>
    );
    body = (
      <>
        {problem}
        {top}
        {lock}
        {targetsGrid}
        {parts}
        <PhotoCard today={day} flowWeek={flowWeek(firstWeeks)} />
        {hasShareable(progress, units) ? <ShareEntry /> : null}
      </>
    );
  }

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the "+" floats above it (K-1050).
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.frame}>
        <ScrollView contentContainerStyle={styles.body}>
          <ScreenTitle>{t('screens.progress.title')}</ScreenTitle>
          {body}
        </ScrollView>
        <PlusEntry />
      </View>
    </SafeAreaView>
  );
}

/** Share your progress (K-612): only when the user asks, and only once there is a sticker to make (hasShareable) — a card of weeks and calls, made on this phone. A grouped row (K-1054). */
function ShareEntry() {
  return (
    <ListGroup footer={t('share.openNote')}>
      <ListRow label={t('share.open')} icon="square.and.arrow.up" navigates onPress={() => router.push('/share')} />
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: PLUS_CLEARANCE, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  sub: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  small: { fontSize: tokens.type.bodySmall },
  frame: { flex: 1 },
});
